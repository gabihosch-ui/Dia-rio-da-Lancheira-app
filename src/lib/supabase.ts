import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { secureSessionStorage } from './secure-session-storage';

/**
 * Cliente Supabase do app.
 * Usa SOMENTE a URL e a chave pública (anon/publishable). Nunca colocar aqui a
 * chave service_role ou qualquer segredo: tudo que começa com EXPO_PUBLIC_ vai
 * dentro do app e pode ser lido por qualquer pessoa.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      'Supabase não configurado: defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no arquivo .env',
    );
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        storage: secureSessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    // Renova o token apenas com o app em primeiro plano (recomendação do Supabase para apps móveis).
    if (Platform.OS !== 'web') {
      AppState.addEventListener('change', (state) => {
        if (state === 'active') client?.auth.startAutoRefresh();
        else client?.auth.stopAutoRefresh();
      });
    }
  }
  return client;
}
