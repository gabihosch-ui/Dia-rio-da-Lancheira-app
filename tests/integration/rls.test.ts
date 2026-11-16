/**
 * Testes de isolamento (RLS) contra o projeto Supabase de DESENVOLVIMENTO.
 * Usa duas contas de teste comuns (sem papéis) e apenas a chave pública,
 * exatamente como o app. Rodar com: npm run test:rls
 *
 * Cenários de docs/SEGURANCA.md cobertos: 1 (A acessando dados de B),
 * 4 (manipular permissões pelo app), 5 (função administrativa por usuário comum),
 * 6 (manipular IDs).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { testEnv } from './env';

jest.setTimeout(30000);

function newClient(): SupabaseClient {
  return createClient(testEnv.url, testEnv.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Entra com a conta de teste; cria a conta na primeira execução. */
async function signedInClient(user: { email: string; password: string }, publicName: string) {
  const sb = newClient();
  const first = await sb.auth.signInWithPassword(user);
  if (!first.error) return { sb, id: first.data.user.id };
  if (first.error.code !== 'invalid_credentials') throw first.error;
  const created = await sb.auth.signUp({
    ...user,
    options: { data: { nome: `Conta de teste ${publicName}`, nome_publico: publicName } },
  });
  if (created.error) throw created.error;
  if (!created.data.session) {
    throw new Error(
      'O projeto exige confirmação de e-mail. Desligue "Confirm email" no projeto de desenvolvimento para rodar estes testes.',
    );
  }
  return { sb, id: created.data.user!.id };
}

let A: { sb: SupabaseClient; id: string };
let B: { sb: SupabaseClient; id: string };
const anon = newClient();

beforeAll(async () => {
  A = await signedInClient(testEnv.userA, 'Teste A');
  B = await signedInClient(testEnv.userB, 'Teste B');
  // Garante um estado conhecido para os nomes de B.
  await B.sb.from('perfis_privados').update({ nome_completo: 'Conta de teste Teste B' }).eq('id', B.id);
  await B.sb.from('perfis_publicos').update({ nome_publico: 'Teste B' }).eq('id', B.id);
});

afterAll(async () => {
  await Promise.all([A?.sb.auth.signOut(), B?.sb.auth.signOut()]);
});

describe('sem login (anon)', () => {
  it.each([
    'perfis_privados',
    'perfis_publicos',
    'usuario_papeis',
    'auditoria',
    'notificacoes',
    'solicitacoes_exclusao',
  ])('não lê %s', async (table) => {
    const { data, error } = await anon.from(table).select('*').limit(1);
    expect(data).toBeNull();
    expect(error?.code).toBe('42501'); // permission denied
  });
});

describe('perfil privado', () => {
  it('cada pessoa lê apenas o próprio', async () => {
    const own = await A.sb.from('perfis_privados').select('id');
    expect(own.error).toBeNull();
    expect(own.data).toEqual([{ id: A.id }]);
  });

  it('A não lê o perfil privado de B, mesmo pedindo pelo ID', async () => {
    const { data, error } = await A.sb.from('perfis_privados').select('*').eq('id', B.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('A não altera o perfil privado de B', async () => {
    const upd = await A.sb.from('perfis_privados').update({ nome_completo: 'invadido' }).eq('id', B.id).select();
    expect(upd.data ?? []).toEqual([]);
    const check = await B.sb.from('perfis_privados').select('nome_completo').eq('id', B.id).single();
    expect(check.data?.nome_completo).toBe('Conta de teste Teste B');
  });

  it('não é possível trocar o próprio ID para o de outra pessoa', async () => {
    const { error } = await A.sb.from('perfis_privados').update({ id: B.id }).eq('id', A.id);
    expect(error?.code).toBe('42501');
  });

  it('não é possível criar perfil manualmente', async () => {
    const { error } = await A.sb.from('perfis_privados').insert({ id: A.id, nome_completo: 'x' });
    expect(error).not.toBeNull();
  });
});

describe('perfil público', () => {
  it('A vê o nome público de B, sem e-mail ou dados privados', async () => {
    const { data, error } = await A.sb.from('perfis_publicos').select('*').eq('id', B.id).single();
    expect(error).toBeNull();
    expect(data?.nome_publico).toBe('Teste B');
    expect(Object.keys(data ?? {})).not.toContain('email');
    expect(Object.keys(data ?? {})).not.toContain('nome_completo');
  });

  it('A não altera o nome público de B', async () => {
    await A.sb.from('perfis_publicos').update({ nome_publico: 'invadido' }).eq('id', B.id);
    const check = await B.sb.from('perfis_publicos').select('nome_publico').eq('id', B.id).single();
    expect(check.data?.nome_publico).toBe('Teste B');
  });

  it('A altera o próprio nome público', async () => {
    const { data, error } = await A.sb
      .from('perfis_publicos')
      .update({ nome_publico: 'Teste A' })
      .eq('id', A.id)
      .select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('A não consegue remover a própria suspensão (campo de moderação)', async () => {
    const { error } = await A.sb.from('perfis_publicos').update({ suspenso_ate: null }).eq('id', A.id);
    expect(error?.code).toBe('42501');
  });

  it('nome público fora do limite é recusado pelo banco', async () => {
    const { error } = await A.sb.from('perfis_publicos').update({ nome_publico: 'x' }).eq('id', A.id);
    expect(error).not.toBeNull();
  });
});

describe('papéis administrativos', () => {
  it('usuário comum não se concede admin', async () => {
    const { error } = await A.sb.from('usuario_papeis').insert({ usuario_id: A.id, papel: 'admin' });
    expect(error).not.toBeNull();
  });

  it('usuário comum não concede papel a outra pessoa', async () => {
    const { error } = await A.sb.from('usuario_papeis').insert({ usuario_id: B.id, papel: 'moderador' });
    expect(error).not.toBeNull();
  });

  it('usuário comum não vê papéis de outras pessoas', async () => {
    const { data } = await A.sb.from('usuario_papeis').select('*').neq('usuario_id', A.id);
    expect(data ?? []).toEqual([]);
  });

  it('usuário comum não lê a auditoria', async () => {
    const { data } = await A.sb.from('auditoria').select('*').limit(5);
    expect(data ?? []).toEqual([]);
  });

  it('usuário comum não escreve na auditoria', async () => {
    const { error } = await A.sb.from('auditoria').insert({ acao: 'falso', entidade: 'x' });
    expect(error?.code).toBe('42501');
  });

  it('funções internas não ficam expostas pela API', async () => {
    const { error } = await A.sb.rpc('tem_papel', { p: 'admin' });
    expect(error).not.toBeNull();
  });
});

describe('notificações', () => {
  it('usuário não cria notificações (só o servidor)', async () => {
    const { error } = await A.sb.from('notificacoes').insert({ usuario_id: B.id, tipo: 'spam', titulo: 'oi' });
    expect(error?.code).toBe('42501');
  });

  it('A não vê notificações de B', async () => {
    const { data } = await A.sb.from('notificacoes').select('*').eq('usuario_id', B.id);
    expect(data ?? []).toEqual([]);
  });
});

describe('exclusão de conta', () => {
  it('A não pede exclusão da conta de B', async () => {
    const { error } = await A.sb.from('solicitacoes_exclusao').insert({ usuario_id: B.id });
    expect(error).not.toBeNull();
  });

  it('A não vê pedidos de exclusão de B', async () => {
    const { data } = await A.sb.from('solicitacoes_exclusao').select('*').eq('usuario_id', B.id);
    expect(data ?? []).toEqual([]);
  });
});
