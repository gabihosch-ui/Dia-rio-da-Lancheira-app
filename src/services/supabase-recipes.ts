/**
 * Biblioteca de receitas no Supabase do app.
 * Toda a proteção está no servidor: a RLS só devolve ingredientes, preparo,
 * congelamento e vídeo para quem tem direito; o app apenas interpreta a resposta.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';

import type {
  ClubAccess,
  PlannerRecipeSource,
  RecipeCategory,
  RecipeDetail,
  RecipeIngredient,
  RecipeSummary,
  Unit,
} from '@/domain/models';
import { normalizeSearch } from '@/lib/recipes';
import { getSupabase } from '@/lib/supabase';

import { RECIPES_PAGE_SIZE, ServiceError, type RecipeQuery, type RecipesService, type VideoTokenResult } from './types';

const SUMMARY_COLUMNS =
  'id, titulo, descricao, capa_path, tempo_total_min, rendimento, pode_congelar, exclusiva, publicada_em';

interface RecipeRow {
  id: string;
  titulo: string;
  descricao: string;
  capa_path: string | null;
  tempo_total_min: number;
  rendimento: string;
  pode_congelar: boolean;
  exclusiva: boolean;
  publicada_em: string | null;
  receita_categorias?: { categoria_id: string }[];
}

function fail(error: { message?: string } | null, message = 'Não foi possível carregar as receitas.'): never {
  if (__DEV__ && error) console.warn('[receitas]', error.message);
  throw new ServiceError(message, 'network');
}

function coverUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  return getSupabase().storage.from('receitas').getPublicUrl(path).data.publicUrl;
}

function toSummary(r: RecipeRow): RecipeSummary {
  return {
    id: r.id,
    title: r.titulo,
    shortDescription: r.descricao,
    categoryIds: (r.receita_categorias ?? []).map((c) => c.categoria_id),
    prepMinutes: r.tempo_total_min,
    yieldLabel: r.rendimento,
    freezable: r.pode_congelar,
    isOfficial: true,
    isExclusive: r.exclusiva,
    coverEmoji: '🍽️',
    coverUri: coverUrl(r.capa_path),
    publishedAt: r.publicada_em ?? '',
  };
}

function toCategory(c: { id: string; nome: string; emoji: string | null; ordem: number }): RecipeCategory {
  return { id: c.id, name: c.nome, emoji: c.emoji ?? '', sortOrder: c.ordem };
}

function toIngredient(i: {
  id: string;
  nome: string;
  quantidade: number | string | null;
  unidade_id: string | null;
  observacao: string | null;
}): RecipeIngredient {
  return {
    ingredientId: i.id,
    name: i.nome,
    quantity: i.quantidade == null ? null : Number(i.quantidade),
    unitId: i.unidade_id,
    note: i.observacao ?? undefined,
  };
}

async function myAccess(): Promise<ClubAccess> {
  const { data, error } = await getSupabase().rpc('meu_acesso_clube');
  if (error) fail(error, 'Não foi possível verificar seu acesso.');
  const row = (Array.isArray(data) ? data[0] : data) as
    { tem_acesso: boolean; origem: string | null; valido_ate: string | null } | undefined;
  return {
    hasAccess: !!row?.tem_acesso,
    origin: (row?.origem as ClubAccess['origin']) ?? null,
    validUntil: row?.valido_ate ?? null,
  };
}

export const supabaseRecipes: RecipesService = {
  async listCategories() {
    const { data, error } = await getSupabase()
      .from('categorias_receita')
      .select('id, nome, emoji, ordem')
      .eq('ativa', true)
      .order('ordem');
    if (error) fail(error);
    return data.map(toCategory);
  },

  async listUnits(): Promise<Unit[]> {
    const { data, error } = await getSupabase()
      .from('unidades')
      .select('id, singular, plural, abreviacao')
      .order('ordem');
    if (error) fail(error);
    return data.map((u) => ({ id: u.id, abbreviation: u.abreviacao, singular: u.singular, plural: u.plural }));
  },

  async search(q: RecipeQuery, page: number) {
    const joins = [
      q.categoryId ? 'receita_categorias!inner(categoria_id)' : 'receita_categorias(categoria_id)',
      q.favoritesOnly ? 'receitas_favoritas!inner(receita_id)' : null,
    ].filter(Boolean);
    let query = getSupabase()
      .from('receitas')
      .select(`${SUMMARY_COLUMNS}, ${joins.join(', ')}`)
      .eq('status', 'publicada');
    const text = normalizeSearch(q.text ?? '');
    if (text) query = query.ilike('busca', `%${text.replace(/[%_\\]/g, (m) => `\\${m}`)}%`);
    if (q.categoryId) query = query.eq('receita_categorias.categoria_id', q.categoryId);
    if (q.freezableOnly) query = query.eq('pode_congelar', true);
    if (q.quickOnly) query = query.lte('tempo_total_min', 30);
    const from = page * RECIPES_PAGE_SIZE;
    // Pede um a mais para saber se há próxima página.
    const { data, error } = await query
      .order('publicada_em', { ascending: false })
      .order('id')
      .range(from, from + RECIPES_PAGE_SIZE);
    if (error) fail(error);
    const rows = data as unknown as RecipeRow[];
    return { items: rows.slice(0, RECIPES_PAGE_SIZE).map(toSummary), hasMore: rows.length > RECIPES_PAGE_SIZE };
  },

  async listFeatured(limit: number) {
    const { data, error } = await getSupabase()
      .from('receitas')
      .select(`${SUMMARY_COLUMNS}, receita_categorias(categoria_id)`)
      .eq('status', 'publicada')
      .eq('destaque', true)
      .order('publicada_em', { ascending: false })
      .limit(limit);
    if (error) fail(error);
    return (data as unknown as RecipeRow[]).map(toSummary);
  },

  async getDetail(id: string): Promise<RecipeDetail | null> {
    const sb = getSupabase();
    const meta = await sb
      .from('receitas')
      .select(`${SUMMARY_COLUMNS}, receita_categorias(categoria_id, categorias_receita(id, nome, emoji, ordem))`)
      .eq('id', id)
      .eq('status', 'publicada')
      .maybeSingle();
    if (meta.error) fail(meta.error, 'Não foi possível abrir a receita.');
    if (!meta.data) return null;
    type CategoryJoin = { id: string; nome: string; emoji: string | null; ordem: number };
    const row = meta.data as unknown as Omit<RecipeRow, 'receita_categorias'> & {
      receita_categorias: { categoria_id: string; categorias_receita: CategoryJoin | null }[];
    };

    const [access, ingredients, steps, freezing, video] = await Promise.all([
      myAccess(),
      sb
        .from('receita_ingredientes')
        .select('id, nome, quantidade, unidade_id, observacao')
        .eq('receita_id', id)
        .order('ordem'),
      sb.from('receita_passos').select('ordem, texto').eq('receita_id', id).order('ordem'),
      sb
        .from('receita_congelamento')
        .select('prazo_dias, como_embalar, como_descongelar')
        .eq('receita_id', id)
        .maybeSingle(),
      sb.from('receita_videos').select('status, duracao_segundos').eq('receita_id', id).maybeSingle(),
    ]);
    for (const r of [ingredients, steps, freezing, video])
      if (r.error) fail(r.error, 'Não foi possível abrir a receita.');

    // O servidor não entrega o conteúdo sem direito; a interface mostra o convite ao Clube.
    const locked = row.exclusiva && !access.hasAccess;
    return {
      ...toSummary(row),
      description: row.descricao,
      categories: row.receita_categorias
        .map((rc) => rc.categorias_receita)
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map(toCategory)
        .sort((a, b) => a.sortOrder - b.sortOrder),
      content: locked
        ? null
        : {
            ingredients: (ingredients.data ?? []).map(toIngredient),
            steps: (steps.data ?? []).map((s) => ({ order: s.ordem + 1, text: s.texto })),
            freezing: freezing.data
              ? {
                  days: freezing.data.prazo_dias,
                  howToPack: freezing.data.como_embalar,
                  howToThaw: freezing.data.como_descongelar,
                }
              : null,
            video: video.data
              ? {
                  status: video.data.status as 'pendente' | 'pronto' | 'erro',
                  durationSeconds: video.data.duracao_segundos,
                }
              : null,
          },
    };
  },

  // Perguntas e respostas chegam com a Comunidade (Fase 6).
  async listQuestions() {
    return [];
  },

  async listFavoriteIds() {
    const { data, error } = await getSupabase().from('receitas_favoritas').select('receita_id');
    if (error) fail(error, 'Não foi possível carregar seus favoritos.');
    return data.map((f) => f.receita_id as string);
  },

  async setFavorite(recipeId: string, favorite: boolean) {
    const sb = getSupabase();
    const { error } = favorite
      ? await sb.from('receitas_favoritas').insert({ receita_id: recipeId })
      : await sb.from('receitas_favoritas').delete().eq('receita_id', recipeId);
    // 23505 = já era favorita (dois toques rápidos): resultado é o mesmo.
    if (error && error.code !== '23505') fail(error, 'Não foi possível atualizar seus favoritos.');
  },

  getMyAccess: myAccess,

  async requestVideo(recipeId: string): Promise<VideoTokenResult> {
    const { data, error } = await getSupabase().functions.invoke('video-token', { body: { receita_id: recipeId } });
    if (!error && data?.url) return { ok: true, url: data.url, expiresAt: data.expires_at };
    const status = error instanceof FunctionsHttpError ? (error.context as Response).status : 0;
    if (status === 403) return { ok: false, reason: 'denied' };
    if (status === 404) return { ok: false, reason: 'unavailable' };
    if (status === 503) return { ok: false, reason: 'not_configured' };
    if (status === 429) return { ok: false, reason: 'rate_limited' };
    return { ok: false, reason: 'error' };
  },

  async getForPlanner(recipeIds: string[]): Promise<PlannerRecipeSource[]> {
    if (recipeIds.length === 0) return [];
    const { data, error } = await getSupabase()
      .from('receitas')
      .select(
        'id, titulo, rendimento, receita_categorias(categoria_id), receita_ingredientes(id, nome, quantidade, unidade_id, observacao, ordem)',
      )
      .in('id', recipeIds)
      .eq('status', 'publicada');
    if (error) fail(error);
    return (
      data as unknown as {
        id: string;
        titulo: string;
        rendimento: string;
        receita_categorias: { categoria_id: string }[];
        receita_ingredientes: (Parameters<typeof toIngredient>[0] & { ordem: number })[];
      }[]
    ).map((r) => ({
      id: r.id,
      title: r.titulo,
      yieldLabel: r.rendimento,
      categoryIds: r.receita_categorias.map((c) => c.categoria_id),
      ingredients: [...r.receita_ingredientes].sort((a, b) => a.ordem - b.ordem).map(toIngredient),
    }));
  },
};
