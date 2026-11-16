/**
 * Implementação DEMONSTRATIVA dos serviços: lê os dados fictícios em memória,
 * com uma pequena espera para exibir os estados de carregamento.
 * Não faz chamadas de rede e não grava nada fora do aparelho.
 */
import { demoNotifications, demoPlan, demoPosts, demoQuestions, demoSideItems } from '@/data/demo/misc';
import { demoCategories, demoRecipes, demoUnits } from '@/data/demo/recipes';
import type { Recipe, RecipeSummary } from '@/domain/models';

import { ServiceError, type RecipeQuery, type Services } from './types';

export const demoRuntime = {
  /** Ativado em Perfil › Ferramentas de demonstração para visualizar estados de erro. */
  simulateErrors: false,
  latencyMs: 450,
};

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

export const demoServices: Services = {
  recipes: {
    listCategories: () => respond([...demoCategories].sort((a, b) => a.sortOrder - b.sortOrder)),
    listUnits: () => respond(demoUnits),
    search: (q: RecipeQuery) => {
      const text = q.text ? normalize(q.text.trim()) : '';
      const result = demoRecipes
        .filter((r) => !text || normalize(r.title).includes(text) || normalize(r.shortDescription).includes(text))
        .filter((r) => !q.categoryId || r.categoryIds.includes(q.categoryId))
        .filter((r) => !q.freezableOnly || r.freezable)
        .filter((r) => !q.quickOnly || r.prepMinutes <= 30)
        .map(toSummary)
        .sort(sortByNewest);
      return respond(result);
    },
    getById: (id) => respond(demoRecipes.find((r) => r.id === id) ?? null),
    listAllFull: () => respond(demoRecipes),
    listQuestions: (recipeId) => respond(demoQuestions.filter((q) => q.recipeId === recipeId)),
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
