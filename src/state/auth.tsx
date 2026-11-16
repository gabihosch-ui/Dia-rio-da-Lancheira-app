/**
 * Sessão de login (Supabase Auth) e dados da conta da pessoa logada.
 * A sessão fica no armazenamento seguro do aparelho (ver lib/secure-session-storage).
 */
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authErrorMessage } from '@/lib/auth-errors';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { loadMyAccount, recordTermsAcceptance, type MyAccount } from '@/services/account';

type Result = { ok: true } | { ok: false; message: string };
type SignUpResult = { ok: true; needsEmailConfirmation: boolean } | { ok: false; message: string };

interface AuthContextValue {
  isConfigured: boolean;
  isLoading: boolean;
  session: Session | null;
  account: MyAccount | null;
  accountError: string | null;
  refreshAccount: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<Result>;
  signUp: (input: { email: string; password: string; fullName: string; publicName: string }) => Promise<SignUpResult>;
  requestPasswordReset: (email: string) => Promise<Result>;
  updatePassword: (password: string) => Promise<Result>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [account, setAccount] = useState<MyAccount | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    sb.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setIsLoading(false));
    const { data } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const load = useCallback(
    (s: Session) =>
      loadMyAccount(s).then(
        (loaded) => {
          setAccount(loaded);
          setAccountError(null);
        },
        (e: unknown) => setAccountError(e instanceof Error ? e.message : 'Não foi possível carregar seu perfil.'),
      ),
    [],
  );

  const refreshAccount = useCallback(async () => {
    if (session) await load(session);
  }, [session, load]);

  // Carrega a conta quando a pessoa logada muda (não a cada renovação de token).
  useEffect(() => {
    if (session && userId) void load(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, load]);

  const signIn = useCallback(async (email: string, password: string): Promise<Result> => {
    const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, message: authErrorMessage(error) } : { ok: true };
  }, []);

  const signUp = useCallback<AuthContextValue['signUp']>(async ({ email, password, fullName, publicName }) => {
    const { data, error } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nome: fullName.trim(), nome_publico: publicName.trim() } },
    });
    if (error) return { ok: false, message: authErrorMessage(error) };
    // Sem sessão = o projeto exige confirmação por e-mail.
    if (!data.session || !data.user) return { ok: true, needsEmailConfirmation: true };
    try {
      await recordTermsAcceptance(data.user.id);
    } catch {
      // O aceite é registrado novamente no próximo acesso se falhar agora.
    }
    return { ok: true, needsEmailConfirmation: false };
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<Result> => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('/redefinir-senha'),
    });
    // Mesmo que o e-mail não exista, respondemos igual (não revela quem tem conta).
    if (error && error.code !== 'user_not_found') return { ok: false, message: authErrorMessage(error) };
    return { ok: true };
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<Result> => {
    const { error } = await getSupabase().auth.updateUser({ password });
    return error ? { ok: false, message: authErrorMessage(error) } : { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setAccount(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured: isSupabaseConfigured,
      isLoading,
      session,
      account: session ? account : null,
      accountError,
      refreshAccount,
      signIn,
      signUp,
      requestPasswordReset,
      updatePassword,
      signOut,
    }),
    [
      isLoading,
      session,
      account,
      accountError,
      refreshAccount,
      signIn,
      signUp,
      requestPasswordReset,
      updatePassword,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}
