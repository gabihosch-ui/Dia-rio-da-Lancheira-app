// Edge Function: exclui a conta da pessoa autenticada (pedido feito dentro do app).
//
// Segurança:
//  * A identidade vem do token de acesso enviado no cabeçalho Authorization,
//    validado no servidor de Auth. Nenhum ID enviado pelo cliente é aceito.
//  * Exige login recente (últimos 10 minutos): o app pede a senha de novo antes.
//  * A chave secreta (que ignora RLS) existe apenas aqui, no servidor.
//  * Ao apagar o usuário, as tabelas ligadas a auth.users são apagadas em cascata.
//  * A auditoria registra o evento sem e-mail ou outros dados pessoais.
import { createClient } from 'npm:@supabase/supabase-js@2';

const RECENT_LOGIN_MS = 10 * 60 * 1000;

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

function secretKey(): string {
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (raw) {
    try {
      const keys = JSON.parse(raw) as Record<string, string>;
      if (keys.default) return keys.default;
    } catch {
      // segue para a chave legada
    }
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!legacy) throw new Error('Chave secreta indisponível');
  return legacy;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'not_authenticated' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return json(401, { error: 'not_authenticated' });

  const lastSignIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : 0;
  if (Date.now() - lastSignIn > RECENT_LOGIN_MS) {
    return json(403, { error: 'reauthentication_required' });
  }

  const audit = await admin.from('auditoria').insert({
    ator_id: null,
    acao: 'conta_excluida',
    entidade: 'auth.users',
    entidade_id: user.id,
    detalhes: { origem: 'app' },
  });
  if (audit.error) {
    console.error('auditoria falhou', audit.error.code);
    return json(500, { error: 'internal_error' });
  }

  const del = await admin.auth.admin.deleteUser(user.id);
  if (del.error) {
    console.error('exclusão falhou', del.error.status);
    return json(500, { error: 'internal_error' });
  }

  return json(200, { ok: true });
});
