import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

export type Role = 'admin' | 'editor' | 'moderador';

interface AuthValue {
  loading: boolean;
  session: Session | null;
  roles: Role[];
  isAdmin: boolean;
  canEditRecipes: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

/**
 * Sessão do painel. Os papéis são lidos do banco apenas para montar a
 * interface; cada ação é verificada novamente no servidor.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('usuario_papeis')
      .select('papel')
      .eq('usuario_id', userId)
      .then(({ data }) => {
        if (cancelled) return;
        setRoles(((data ?? []) as { papel: Role }[]).map((r) => r.papel));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const value: AuthValue = {
    loading,
    session,
    roles: session ? roles : [],
    isAdmin: !!session && roles.includes('admin'),
    canEditRecipes: !!session && (roles.includes('admin') || roles.includes('editor')),
    signOut: async () => {
      await supabase.auth.signOut();
      setRoles([]);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}
