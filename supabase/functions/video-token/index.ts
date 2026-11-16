// Edge Function: emite uma autorização TEMPORÁRIA para assistir ao vídeo de uma receita.
//
// Fluxo:
//  1. Valida o token de login (identidade vem do servidor de Auth).
//  2. Consulta o vídeo COMO a própria pessoa: a RLS só devolve a linha se ela
//     tiver direito ao conteúdo (equipe, acesso de teste ou, no futuro, assinatura).
//  3. Limita a quantidade de pedidos por pessoa (contra abuso).
//  4. Pede ao Cloudflare Stream um token assinado de curta duração.
//
// As credenciais do Cloudflare existem apenas como segredos desta função.
// Sem elas configuradas, responde 503 (video_provider_not_configured) — nunca
// devolve link público.
import { createClient } from 'npm:@supabase/supabase-js@2';

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hora
const RATE_WINDOW_MINUTES = 10;
const RATE_MAX = 30;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function firstKey(jsonVar: string, legacyVar: string): string {
  const raw = Deno.env.get(jsonVar);
  if (raw) {
    try {
      const keys = JSON.parse(raw) as Record<string, string>;
      if (keys.default) return keys.default;
    } catch {
      // usa a chave legada
    }
  }
  const legacy = Deno.env.get(legacyVar);
  if (!legacy) throw new Error(`${legacyVar} indisponível`);
  return legacy;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'not_authenticated' });

  let receitaId: unknown;
  try {
    receitaId = (await req.json())?.receita_id;
  } catch {
    return json(400, { error: 'invalid_request' });
  }
  if (typeof receitaId !== 'string' || !UUID_RE.test(receitaId)) return json(400, { error: 'invalid_request' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, firstKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json(401, { error: 'not_authenticated' });

  // Cliente com a identidade da pessoa: a RLS decide o acesso.
  const asUser = createClient(url, firstKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const recipe = await asUser.from('receitas').select('id').eq('id', receitaId).maybeSingle();
  if (recipe.error || !recipe.data) return json(404, { error: 'recipe_not_found' });

  const visible = await asUser.from('receita_videos').select('status').eq('receita_id', receitaId).maybeSingle();
  if (visible.error) return json(500, { error: 'internal_error' });

  const video = await admin
    .from('receita_videos')
    .select('provider_video_id, status')
    .eq('receita_id', receitaId)
    .maybeSingle();
  if (video.error) return json(500, { error: 'internal_error' });
  if (!video.data) return json(404, { error: 'video_unavailable' });
  if (!visible.data) return json(403, { error: 'access_denied' });
  if (video.data.status !== 'pronto') return json(404, { error: 'video_unavailable' });

  // Limite de pedidos por pessoa.
  const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60 * 1000).toISOString();
  const recent = await admin
    .from('registro_tokens_video')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', user.id)
    .gte('criado_em', since);
  if ((recent.count ?? 0) >= RATE_MAX) return json(429, { error: 'rate_limited' });

  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
  const customerCode = Deno.env.get('CLOUDFLARE_STREAM_CUSTOMER_CODE');
  if (!accountId || !apiToken || !customerCode) {
    return json(503, { error: 'video_provider_not_configured' });
  }

  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const cf = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${video.data.provider_video_id}/token`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ exp }),
    },
  );
  if (!cf.ok) {
    console.error('cloudflare token falhou', cf.status);
    return json(502, { error: 'video_provider_error' });
  }
  const signed = (await cf.json())?.result?.token;
  if (typeof signed !== 'string') return json(502, { error: 'video_provider_error' });

  await admin.from('registro_tokens_video').insert({ usuario_id: user.id, receita_id: receitaId });

  return json(200, {
    url: `https://customer-${customerCode}.cloudflarestream.com/${signed}/manifest/video.m3u8`,
    expires_at: new Date(exp * 1000).toISOString(),
  });
});
