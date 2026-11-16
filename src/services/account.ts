/**
 * Conta da pessoa logada: perfil privado, perfil público, papéis e exclusão.
 * Toda a proteção está no banco (RLS): estas funções nunca enviam o ID do
 * usuário para decidir acesso — o Supabase usa o token da sessão.
 */
import type { AuthError, PostgrestError, Session } from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase';

export interface MyAccount {
  id: string;
  email: string;
  fullName: string;
  publicName: string;
  createdAt: string;
  acceptedTermsAt: string | null;
  roles: string[];
  deletionRequestedAt: string | null;
}

export class AccountError extends Error {}

function fail(e: PostgrestError | AuthError | null, fallback: string): never {
  // Não expor detalhes técnicos na tela; manter a mensagem amigável.
  if (__DEV__ && e) console.warn('[conta]', e.message);
  throw new AccountError(fallback);
}

export async function loadMyAccount(session: Session): Promise<MyAccount> {
  const sb = getSupabase();
  const uid = session.user.id;
  const [priv, pub, roles, deletion] = await Promise.all([
    sb.from('perfis_privados').select('nome_completo, criado_em, aceitou_termos_em').eq('id', uid).single(),
    sb.from('perfis_publicos').select('nome_publico').eq('id', uid).single(),
    sb.from('usuario_papeis').select('papel'),
    sb.from('solicitacoes_exclusao').select('solicitado_em, status').eq('status', 'pendente').maybeSingle(),
  ]);
  if (priv.error) fail(priv.error, 'Não foi possível carregar seu perfil.');
  if (pub.error) fail(pub.error, 'Não foi possível carregar seu perfil.');
  return {
    id: uid,
    email: session.user.email ?? '',
    fullName: priv.data.nome_completo,
    publicName: pub.data.nome_publico,
    createdAt: priv.data.criado_em,
    acceptedTermsAt: priv.data.aceitou_termos_em,
    roles: (roles.data ?? []).map((r) => r.papel as string),
    deletionRequestedAt: deletion.data?.solicitado_em ?? null,
  };
}

export const NAME_LIMITS = { fullMax: 120, publicMin: 2, publicMax: 40 } as const;

export function validateNames(fullName: string, publicName: string): string | null {
  if (!fullName.trim()) return 'Informe seu nome.';
  if (fullName.trim().length > NAME_LIMITS.fullMax) return 'Nome muito longo.';
  const p = publicName.trim();
  if (p.length < NAME_LIMITS.publicMin || p.length > NAME_LIMITS.publicMax) {
    return `O nome público deve ter entre ${NAME_LIMITS.publicMin} e ${NAME_LIMITS.publicMax} caracteres.`;
  }
  return null;
}

export async function updateMyNames(userId: string, fullName: string, publicName: string) {
  const sb = getSupabase();
  const [a, b] = await Promise.all([
    sb.from('perfis_privados').update({ nome_completo: fullName.trim() }).eq('id', userId),
    sb.from('perfis_publicos').update({ nome_publico: publicName.trim() }).eq('id', userId),
  ]);
  if (a.error || b.error) fail(a.error ?? b.error, 'Não foi possível salvar. Tente novamente.');
}

export async function recordTermsAcceptance(userId: string) {
  const { error } = await getSupabase()
    .from('perfis_privados')
    .update({ aceitou_termos_em: new Date().toISOString() })
    .eq('id', userId);
  if (error) fail(error, 'Não foi possível registrar o aceite dos termos.');
}

export async function requestAccountDeletion(userId: string) {
  const { error } = await getSupabase().from('solicitacoes_exclusao').insert({ usuario_id: userId });
  if (error && error.code !== '23505') fail(error, 'Não foi possível registrar o pedido. Tente novamente.');
}
