import { isSupabaseConfigured } from '@/lib/supabase';

import { demoServices } from './demo';
import { supabaseRecipes } from './supabase-recipes';
import type { Services } from './types';

/**
 * Ponto único de acesso aos dados.
 * - Receitas: Supabase quando o .env está configurado; dados fictícios no modo demonstração.
 * - Comunidade, notificações e itens do Planejador: ainda demonstrativos (Fases 5 e 6).
 */
export const services: Services = {
  recipes: isSupabaseConfigured ? supabaseRecipes : demoServices.recipes,
  community: demoServices.community,
  catalog: demoServices.catalog,
};

/** true quando as receitas vêm do banco real. */
export const USING_REAL_RECIPES = isSupabaseConfigured;

export * from './types';
