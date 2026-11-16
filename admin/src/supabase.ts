import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const key = import.meta.env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error('Configure VITE_PUBLIC_SUPABASE_URL e VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY em admin/.env.local');
}

/**
 * Cliente do painel: usa apenas a chave pública. Todas as permissões são
 * verificadas no banco (RLS e funções administrativas que exigem papel).
 */
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'dl-admin-auth' },
});

export const ENV_LABEL = import.meta.env.VITE_PUBLIC_ENVIRONMENT_LABEL ?? '';

export function coverPublicUrl(path: string | null): string | null {
  return path ? supabase.storage.from('receitas').getPublicUrl(path).data.publicUrl : null;
}
