/**
 * Testes da Edge Function "excluir-conta" no projeto de DESENVOLVIMENTO.
 * Cria uma conta descartável a cada execução e a exclui pela função.
 * Cenário 10 de docs/SEGURANCA.md (exclusão de conta e dados associados).
 */
import { randomBytes } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { testEnv } from './env';

jest.setTimeout(30000);

const fnUrl = `${testEnv.url}/functions/v1/excluir-conta`;

function newClient() {
  return createClient(testEnv.url, testEnv.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function callFunction(headers: Record<string, string>) {
  return fetch(fnUrl, { method: 'POST', headers: { apikey: testEnv.anonKey, ...headers } });
}

describe('excluir-conta', () => {
  it('recusa chamada sem login', async () => {
    const res = await callFunction({});
    expect(res.status).toBe(401);
  });

  it('recusa a chave pública no lugar do token de usuário', async () => {
    const res = await callFunction({ Authorization: `Bearer ${testEnv.anonKey}` });
    expect(res.status).toBe(401);
  });

  it('recusa token inventado', async () => {
    const res = await callFunction({ Authorization: 'Bearer abc.def.ghi' });
    expect(res.status).toBe(401);
  });

  it('exclui somente a conta de quem chamou, com perfis em cascata', async () => {
    // Conta descartável C
    const c = newClient();
    const email = `teste.c.${Date.now()}@example.com`;
    const password = `${randomBytes(12).toString('base64url')}a1`;
    const created = await c.auth.signUp({
      email,
      password,
      options: { data: { nome: 'Conta descartável', nome_publico: 'Teste C' } },
    });
    expect(created.error).toBeNull();
    const cId = created.data.user!.id;
    const token = created.data.session!.access_token;

    // A (conta de teste fixa) enxerga o perfil público de C antes
    const a = newClient();
    const signedA = await a.auth.signInWithPassword(testEnv.userA);
    expect(signedA.error).toBeNull();
    const before = await a.from('perfis_publicos').select('id').eq('id', cId);
    expect(before.data).toHaveLength(1);

    const res = await callFunction({ Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);

    // Perfil apagado em cascata e login impossível
    const after = await a.from('perfis_publicos').select('id').eq('id', cId);
    expect(after.data).toEqual([]);
    const relogin = await newClient().auth.signInWithPassword({ email, password });
    expect(relogin.error?.code).toBe('invalid_credentials');

    // A conta A continua existindo
    const stillA = await a.from('perfis_privados').select('id');
    expect(stillA.data).toEqual([{ id: signedA.data.user!.id }]);
    await a.auth.signOut();
  });
});
