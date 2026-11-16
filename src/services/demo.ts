/**
 * Implementação DEMONSTRATIVA dos serviços: lê os dados fictícios em memória,
 * com uma pequena espera para exibir os estados de carregamento.
 * Não faz chamadas de rede e não grava nada fora do aparelho.
 */
import { demoNotifications, demoPlan, demoPosts, demoQuestions, demoSideItems } from '@/data/demo/misc';
import { demoCategories, demoRecipes, demoUnits } from '@/data/demo/recipes';
import type { Recipe, RecipeDetail, RecipeSummary } from '@/domain/models';

import { RECIPES_PAGE_SIZE, ServiceError, type RecipeQuery, type Services } from './types';

export const demoRuntime = {
  /** Ativado em Perfil › Ferramentas de demonstração para visualizar estados de erro. */
  simulateErrors: false,
  latencyMs: 450,
  /** Espelha o simulador de assinatura do protótipo (somente modo demonstração). */
  hasClubAccess: false,
};

const demoFavorites = new Set<string>(['r-muffin-banana']);

async function respond<T>(value: T): Promise<T> {
  await new Promise((r) => setTimeout(r, demoRuntime.latencyMs));
  if (demoRuntime.simulateErrors) {
    throw new ServiceError('Não foi possível carregar agora. Verifique sua conexão e tente novamente.', 'network');
  }
  // Cópia para que as telas nunca alterem os dados de origem por referência.
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function toSummary(r: Recipe): RecipeSummary {
  const { description: _d, video: _v, ingredients: _i, steps: _s, freezing: _f, tips: _t, ...summary } = r;
  return summary;
}

function sortByNewest(a: RecipeSummary, b: RecipeSummary) {
  return b.publishedAt.localeCompare(a.publishedAt);
}

function toDetail(r: Recipe): RecipeDetail {
  const locked = r.isExclusive && !demoRuntime.hasClubAccess;
  return {
    ...toSummary(r),
    description: r.description,
    categories: demoCategories.filter((c) => r.categoryIds.includes(c.id)),
    tips: r.tips,
    content: locked
      ? null
      : {
          ingredients: r.ingredients,
          steps: r.steps,
          freezing: r.freezing.freezable
            ? { days: r.freezing.maxDays, howToPack: r.freezing.howTo, howToThaw: '' }
            : null,
          video: r.video ? { status: 'pronto', durationSeconds: r.video.durationSeconds } : null,
        },
  };
}

export const demoServices: Services = {
  recipes: {
    listCategories: () => respond([...demoCategories].sort((a, b) => a.sortOrder - b.sortOrder)),
    listUnits: () => respond(demoUnits),
    search: (q: RecipeQuery, page: number) => {
      const text = q.text ? normalize(q.text.trim()) : '';
      const all = demoRecipes
        .filter((r) => !text || normalize(r.title).includes(text))
        .filter((r) => !q.categoryId || r.categoryIds.includes(q.categoryId))
        .filter((r) => !q.freezableOnly || r.freezable)
        .filter((r) => !q.quickOnly || r.prepMinutes <= 30)
        .filter((r) => !q.favoritesOnly || demoFavorites.has(r.id))
        .map(toSummary)
        .sort(sortByNewest);
      const start = page * RECIPES_PAGE_SIZE;
      return respond({
        items: all.slice(start, start + RECIPES_PAGE_SIZE),
        hasMore: all.length > start + RECIPES_PAGE_SIZE,
      });
    },
    listFeatured: (limit) => respond(demoRecipes.map(toSummary).sort(sortByNewest).slice(0, limit)),
    getDetail: (id) => {
      const r = demoRecipes.find((x) => x.id === id);
      return respond(r ? toDetail(r) : null);
    },
    listQuestions: (recipeId) => respond(demoQuestions.filter((q) => q.recipeId === recipeId)),
    listFavoriteIds: () => respond([...demoFavorites]),
    setFavorite: async (recipeId, favorite) => {
      if (favorite) demoFavorites.add(recipeId);
      else demoFavorites.delete(recipeId);
    },
    getMyAccess: async () => ({
      hasAccess: demoRuntime.hasClubAccess,
      origin: demoRuntime.hasClubAccess ? 'demo' : null,
      validUntil: null,
    }),
    // Não existe vídeo real no modo demonstração.
    requestVideo: async () => ({ ok: false, reason: 'not_configured' }),
    getForPlanner: (ids) =>
      respond(
        demoRecipes
          .filter((r) => ids.includes(r.id))
          .map((r) => ({
            id: r.id,
            title: r.title,
            yieldLabel: r.yieldLabel,
            categoryIds: r.categoryIds,
            ingredients: r.ingredients,
          })),
      ),
  },
  community: {
    listPosts: () => respond(demoPosts),
    getPost: (id) => respond(demoPosts.find((p) => p.id === id) ?? null),
  },
  catalog: {
    getPlan: () => respond(demoPlan),
    listSideItems: () => respond(demoSideItems),
    listNotifications: () => respond(demoNotifications),
  },
};
