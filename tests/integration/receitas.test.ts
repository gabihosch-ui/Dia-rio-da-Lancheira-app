/**
 * Fase 3 — Biblioteca de receitas: testes contra o Supabase de DESENVOLVIMENTO.
 * Verificam as permissões REAIS do backend (RLS, funções administrativas e a
 * função video-token), com três contas: A e B (comuns) e ADMIN (papel admin
 * concedido manualmente). As receitas de teste são criadas e apagadas aqui.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { testEnv } from './env';

jest.setTimeout(60000);

function newClient(): SupabaseClient {
  return createClient(testEnv.url, testEnv.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function login(user: { email: string; password: string }, publicName: string) {
  const sb = newClient();
  const first = await sb.auth.signInWithPassword(user);
  if (!first.error) return { sb, id: first.data.user.id, token: first.data.session.access_token };
  if (first.error.code !== 'invalid_credentials') throw first.error;
  const created = await sb.auth.signUp({ ...user, options: { data: { nome: publicName, nome_publico: publicName } } });
  if (created.error || !created.data.session)
    throw created.error ?? new Error('Confirmação de e-mail ligada no projeto dev.');
  return { sb, id: created.data.user!.id, token: created.data.session.access_token };
}

type Who = Awaited<ReturnType<typeof login>>;
let A: Who;
let B: Who;
let ADMIN: Who;
const suffix = Date.now().toString(36);
const ids: Record<'ex' | 'free' | 'draft' | 'vpend', string> = { ex: '', free: '', draft: '', vpend: '' };
let categoryId = '';
const grants: string[] = [];

function recipe(title: string, extra: Record<string, unknown> = {}) {
  return {
    titulo: title,
    slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${suffix}`,
    descricao: 'Receita criada pelos testes automáticos.',
    tempo_preparo_min: 20,
    tempo_cozimento_min: 25,
    rendimento: '12 unidades',
    pode_congelar: true,
    exclusiva: true,
    destaque: false,
    categorias: [categoryId],
    ingredientes: [
      { nome: 'ovos', quantidade: 2, unidade_id: 'unidade' },
      { nome: 'farinha de aveia', quantidade: 1, unidade_id: 'xicara' },
      { nome: 'sal', observacao: 'a gosto' },
    ],
    passos: ['Misture os ovos.', 'Acrescente a farinha.', 'Asse por 25 minutos.'],
    congelamento: { prazo_dias: 60, como_embalar: 'Pote fechado.', como_descongelar: 'Na geladeira.' },
    video: null,
    ...extra,
  };
}

async function createAndPublish(payload: Record<string, unknown>, publish = true) {
  const { data, error } = await ADMIN.sb.rpc('admin_salvar_receita', { p: payload });
  if (error) throw new Error(`admin_salvar_receita: ${error.message}`);
  if (publish) {
    const st = await ADMIN.sb.rpc('admin_definir_status_receita', { p_id: data, p_status: 'publicada' });
    if (st.error) throw new Error(`publicar: ${st.error.message}`);
  }
  return data as string;
}

function videoToken(token: string | null, body: unknown) {
  return fetch(`${testEnv.url}/functions/v1/video-token`, {
    method: 'POST',
    headers: {
      apikey: testEnv.anonKey,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  A = await login(testEnv.userA, 'Teste A');
  B = await login(testEnv.userB, 'Teste B');
  ADMIN = await login(testEnv.admin, 'Teste Admin');
  const roles = await ADMIN.sb.from('usuario_papeis').select('papel').eq('usuario_id', ADMIN.id);
  if (!roles.data?.some((r) => r.papel === 'admin')) {
    throw new Error(
      `A conta ${testEnv.admin.email} ainda não é admin. Conceda o papel no SQL Editor (docs/SEGURANCA.md › Primeiro administrador).`,
    );
  }
  const cat = await A.sb.from('categorias_receita').select('id').eq('slug', 'bolinhos').single();
  categoryId = cat.data!.id;

  ids.ex = await createAndPublish(
    recipe('Teste Exclusiva', {
      video: { provider_video_id: 'testevideo1234567890', status: 'pronto', duracao_segundos: 95 },
    }),
  );
  ids.free = await createAndPublish(recipe('Teste Gratis', { exclusiva: false }));
  ids.draft = await createAndPublish(recipe('Teste Rascunho'), false);
  ids.vpend = await createAndPublish(
    recipe('Teste Video Pendente', { video: { provider_video_id: 'testevideo0987654321', status: 'pendente' } }),
  );
});

afterAll(async () => {
  for (const g of grants) await ADMIN?.sb.rpc('admin_revogar_acesso', { p_id: g });
  for (const id of Object.values(ids)) if (id) await ADMIN?.sb.rpc('admin_excluir_receita', { p_id: id });
  await Promise.all([A?.sb.auth.signOut(), B?.sb.auth.signOut(), ADMIN?.sb.auth.signOut()]);
});

describe('1. listagem de receitas publicadas', () => {
  it('usuário comum vê as publicadas com metadados e categorias', async () => {
    const { data, error } = await A.sb
      .from('receitas')
      .select('id, titulo, tempo_total_min, receita_categorias(categoria_id)')
      .in('id', [ids.ex, ids.free, ids.vpend]);
    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    expect(data!.find((r) => r.id === ids.ex)?.tempo_total_min).toBe(45);
    expect(data!.find((r) => r.id === ids.ex)?.receita_categorias).toEqual([{ categoria_id: categoryId }]);
  });

  it('busca sem acento encontra o título', async () => {
    const { data } = await A.sb.from('receitas').select('id').ilike('busca', '%teste gratis%').eq('id', ids.free);
    expect(data).toHaveLength(1);
  });

  it('colunas internas não são expostas', async () => {
    const { error } = await A.sb.from('receitas').select('criado_por').eq('id', ids.ex);
    expect(error?.code).toBe('42501');
  });
});

describe('2. bloqueio de conteúdo exclusivo', () => {
  it('sem direito, ingredientes, preparo, congelamento e vídeo não chegam', async () => {
    const [ing, steps, freeze, video] = await Promise.all([
      A.sb.from('receita_ingredientes').select('*').eq('receita_id', ids.ex),
      A.sb.from('receita_passos').select('*').eq('receita_id', ids.ex),
      A.sb.from('receita_congelamento').select('*').eq('receita_id', ids.ex),
      A.sb.from('receita_videos').select('status').eq('receita_id', ids.ex),
    ]);
    expect(ing.data).toEqual([]);
    expect(steps.data).toEqual([]);
    expect(freeze.data).toEqual([]);
    expect(video.data).toEqual([]);
  });

  it('a amostra grátis é liberada para qualquer pessoa logada', async () => {
    const { data } = await A.sb.from('receita_ingredientes').select('nome').eq('receita_id', ids.free).order('ordem');
    expect(data?.map((i) => i.nome)).toEqual(['ovos', 'farinha de aveia', 'sal']);
  });

  it('o próprio app não consegue se conceder direito', async () => {
    const r = await A.sb
      .from('direitos_acesso')
      .insert({ usuario_id: A.id, tipo: 'assinatura', valido_ate: '2099-01-01' });
    expect(r.error).not.toBeNull();
    const rpc = await A.sb.rpc('admin_conceder_acesso_teste', {
      p_email: testEnv.userA.email,
      p_dias: 30,
      p_motivo: 'x',
    });
    expect(rpc.error).not.toBeNull();
    const acc = await A.sb.rpc('meu_acesso_clube');
    expect(acc.data?.[0]?.tem_acesso).toBe(false);
  });
});

describe('3. acesso autorizado por permissão de teste', () => {
  it('admin concede, B lê o conteúdo; ao revogar, perde', async () => {
    const g = await ADMIN.sb.rpc('admin_conceder_acesso_teste', {
      p_email: testEnv.userB.email.toUpperCase(),
      p_dias: 1,
      p_motivo: 'teste automático',
    });
    expect(g.error).toBeNull();
    grants.push(g.data as string);

    const acc = await B.sb.rpc('meu_acesso_clube');
    expect(acc.data?.[0]).toMatchObject({ tem_acesso: true, origem: 'teste' });
    const ing = await B.sb.from('receita_ingredientes').select('nome').eq('receita_id', ids.ex);
    expect(ing.data).toHaveLength(3);
    const vid = await B.sb.from('receita_videos').select('status, duracao_segundos').eq('receita_id', ids.ex);
    expect(vid.data).toEqual([{ status: 'pronto', duracao_segundos: 95 }]);
    const secretId = await B.sb.from('receita_videos').select('provider_video_id').eq('receita_id', ids.ex);
    expect(secretId.error?.code).toBe('42501');

    // A continua sem acesso (o direito é só de B).
    const a = await A.sb.from('receita_ingredientes').select('nome').eq('receita_id', ids.ex);
    expect(a.data).toEqual([]);
    // A não vê o direito de B.
    const seen = await A.sb.from('direitos_acesso').select('id');
    expect(seen.data).toEqual([]);

    const rev = await ADMIN.sb.rpc('admin_revogar_acesso', { p_id: g.data });
    expect(rev.error).toBeNull();
    const after = await B.sb.from('receita_ingredientes').select('nome').eq('receita_id', ids.ex);
    expect(after.data).toEqual([]);
  });
});

describe('4. rascunhos', () => {
  it('rascunho não aparece nem para quem tem acesso de teste', async () => {
    const g = await ADMIN.sb.rpc('admin_conceder_acesso_teste', {
      p_email: testEnv.userB.email,
      p_dias: 1,
      p_motivo: 't',
    });
    grants.push(g.data as string);
    const meta = await B.sb.from('receitas').select('id').eq('id', ids.draft);
    expect(meta.data).toEqual([]);
    const ing = await B.sb.from('receita_ingredientes').select('nome').eq('receita_id', ids.draft);
    expect(ing.data).toEqual([]);
    await ADMIN.sb.rpc('admin_revogar_acesso', { p_id: g.data });
  });
});

describe('5–7. favoritos', () => {
  it('5. favoritar e listar', async () => {
    const ins = await A.sb.from('receitas_favoritas').insert({ receita_id: ids.ex });
    expect(ins.error).toBeNull();
    const list = await A.sb.from('receitas_favoritas').select('receita_id').eq('receita_id', ids.ex);
    expect(list.data).toEqual([{ receita_id: ids.ex }]);
  });

  it('não favorita rascunho', async () => {
    const ins = await A.sb.from('receitas_favoritas').insert({ receita_id: ids.draft });
    expect(ins.error).not.toBeNull();
  });

  it('7. isolamento: B não vê, não apaga e não cria favoritos de A', async () => {
    const seen = await B.sb.from('receitas_favoritas').select('*').eq('usuario_id', A.id);
    expect(seen.data).toEqual([]);
    await B.sb.from('receitas_favoritas').delete().eq('usuario_id', A.id);
    const still = await A.sb.from('receitas_favoritas').select('receita_id').eq('receita_id', ids.ex);
    expect(still.data).toHaveLength(1);
    const spoof = await B.sb.from('receitas_favoritas').insert({ usuario_id: A.id, receita_id: ids.free });
    expect(spoof.error).not.toBeNull();
  });

  it('6. remover favorito', async () => {
    const del = await A.sb.from('receitas_favoritas').delete().eq('receita_id', ids.ex);
    expect(del.error).toBeNull();
    const list = await A.sb.from('receitas_favoritas').select('receita_id').eq('receita_id', ids.ex);
    expect(list.data).toEqual([]);
  });
});

describe('8. usuário comum não altera conteúdo oficial', () => {
  it('bloqueia funções administrativas', async () => {
    const save = await A.sb.rpc('admin_salvar_receita', { p: recipe('Invasora') });
    expect(save.error?.code).toBe('42501');
    const st = await A.sb.rpc('admin_definir_status_receita', { p_id: ids.draft, p_status: 'publicada' });
    expect(st.error?.code).toBe('42501');
    const del = await A.sb.rpc('admin_excluir_receita', { p_id: ids.ex });
    expect(del.error?.code).toBe('42501');
    const get = await A.sb.rpc('admin_obter_receita', { p_id: ids.draft });
    expect(get.error?.code).toBe('42501');
  });

  it('bloqueia escrita direta nas tabelas', async () => {
    const upd = await A.sb.from('receitas').update({ titulo: 'Hackeada' }).eq('id', ids.ex);
    expect(upd.error).not.toBeNull();
    const ins = await A.sb.from('receita_passos').insert({ receita_id: ids.ex, ordem: 99, texto: 'x' });
    expect(ins.error).not.toBeNull();
    const cat = await A.sb.from('categorias_receita').insert({ nome: 'Invasora', slug: `invasora-${suffix}` });
    expect(cat.error).not.toBeNull();
    const check = await ADMIN.sb.rpc('admin_obter_receita', { p_id: ids.ex });
    expect(check.data.titulo).toBe('Teste Exclusiva');
  });

  it('bloqueia envio de fotos oficiais', async () => {
    const up = await A.sb.storage
      .from('receitas')
      .upload(`capas/${ids.ex}/invasora.jpg`, new Blob(['x'], { type: 'image/jpeg' }), { contentType: 'image/jpeg' });
    expect(up.error).not.toBeNull();
  });
});

describe('9. cadastro e edição pelo admin', () => {
  it('edita, despublica e republica', async () => {
    const full = await ADMIN.sb.rpc('admin_obter_receita', { p_id: ids.free });
    expect(full.error).toBeNull();
    const edited = { ...full.data, titulo: 'Teste Gratis Editada', passos: ['Novo passo 1', 'Novo passo 2'] };
    const save = await ADMIN.sb.rpc('admin_salvar_receita', { p: edited });
    expect(save.error).toBeNull();
    const steps = await A.sb.from('receita_passos').select('texto').eq('receita_id', ids.free).order('ordem');
    expect(steps.data?.map((s) => s.texto)).toEqual(['Novo passo 1', 'Novo passo 2']);

    await ADMIN.sb.rpc('admin_definir_status_receita', { p_id: ids.free, p_status: 'despublicada' });
    const hidden = await A.sb.from('receitas').select('id').eq('id', ids.free);
    expect(hidden.data).toEqual([]);
    await ADMIN.sb.rpc('admin_definir_status_receita', { p_id: ids.free, p_status: 'publicada' });
    const back = await A.sb.from('receitas').select('titulo').eq('id', ids.free).single();
    expect(back.data?.titulo).toBe('Teste Gratis Editada');
  });

  it('admin envia foto de capa no caminho permitido', async () => {
    const path = `capas/${ids.ex}/teste-${suffix}.jpg`;
    const up = await ADMIN.sb.storage
      .from('receitas')
      .upload(path, new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }), {
        contentType: 'image/jpeg',
      });
    expect(up.error).toBeNull();
    const bad = await ADMIN.sb.storage
      .from('receitas')
      .upload(`capas/${ids.ex}/script-${suffix}.html`, new Blob(['<script>'], { type: 'text/html' }), {
        contentType: 'text/html',
      });
    expect(bad.error).not.toBeNull();
    await ADMIN.sb.storage.from('receitas').remove([path]);
  });
});

describe('10. validação de entradas', () => {
  it.each([
    ['título curto', { titulo: 'ab', slug: `ab-${suffix}` }],
    ['tempo negativo', { tempo_preparo_min: -5 }],
    ['unidade inexistente', { ingredientes: [{ nome: 'x', quantidade: 1, unidade_id: 'balde' }] }],
    ['quantidade zero', { ingredientes: [{ nome: 'x', quantidade: 0, unidade_id: 'g' }] }],
    ['slug inválido', { slug: 'Slug Com Espaço' }],
    ['ID de vídeo inválido', { video: { provider_video_id: '../etc/passwd', status: 'pronto' } }],
    ['congelamento sem prazo válido', { congelamento: { prazo_dias: 0 } }],
  ])('recusa %s', async (_name, extra) => {
    const r = await ADMIN.sb.rpc('admin_salvar_receita', { p: recipe(`Teste Invalida ${_name}`, extra) });
    expect(r.error).not.toBeNull();
  });

  it('recusa publicar sem etapas de preparo', async () => {
    const r = await ADMIN.sb.rpc('admin_salvar_receita', { p: recipe('Teste Sem Passos', { passos: [] }) });
    expect(r.error).toBeNull();
    const pub = await ADMIN.sb.rpc('admin_definir_status_receita', { p_id: r.data, p_status: 'publicada' });
    expect(pub.error?.message).toMatch(/publicacao_invalida/);
    await ADMIN.sb.rpc('admin_excluir_receita', { p_id: r.data });
  });
});

describe('11–12. token de vídeo', () => {
  it('11. recusa sem login, pedido malformado e usuário sem direito', async () => {
    expect((await videoToken(null, { receita_id: ids.ex })).status).toBe(401);
    expect((await videoToken(A.token, { receita_id: 'nao-e-uuid' })).status).toBe(400);
    const denied = await videoToken(A.token, { receita_id: ids.ex });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({ error: 'access_denied' });
    // Rascunho: nem a existência é revelada a usuário comum.
    expect((await videoToken(A.token, { receita_id: ids.draft })).status).toBe(404);
  });

  it('12. vídeo inexistente ou pendente responde "indisponível"', async () => {
    const none = await videoToken(ADMIN.token, { receita_id: ids.free });
    expect(none.status).toBe(404);
    expect(await none.json()).toEqual({ error: 'video_unavailable' });
    const pend = await videoToken(ADMIN.token, { receita_id: ids.vpend });
    expect(pend.status).toBe(404);
  });

  it('com direito e vídeo pronto: sem credenciais do Cloudflare, responde 503 (pendente de configuração)', async () => {
    const res = await videoToken(ADMIN.token, { receita_id: ids.ex });
    // Quando o Cloudflare Stream for configurado, este teste passa a esperar 200 com url temporária.
    expect([503, 200]).toContain(res.status);
    const body = await res.json();
    if (res.status === 503) expect(body).toEqual({ error: 'video_provider_not_configured' });
    else expect(body.url).toMatch(/^https:\/\/customer-.+\/manifest\/video\.m3u8$/);
  });
});
