/**
 * Regras de negócio puras do Planejador (sem interface e sem acesso a dados).
 * Mantidas separadas para serem testadas e reaproveitadas no backend (Fase 5).
 */
import { WEEK_DAYS, type ID, type PlannerRules, type PlannerWeek, type PrepStatus, type Recipe } from '@/domain/models';

export const PLANNER_STEPS = [
  { step: 1, title: 'Escolha das receitas', short: 'Receitas' },
  { step: 2, title: 'Organização do preparo', short: 'Preparo' },
  { step: 3, title: 'Distribuição pelos dias', short: 'Dias' },
  { step: 4, title: 'Frutas e acompanhamentos', short: 'Extras' },
  { step: 5, title: 'Conferência da despensa', short: 'Despensa' },
  { step: 6, title: 'Cardápio e lista de compras', short: 'Cardápio' },
] as const;

export const TOTAL_STEPS = PLANNER_STEPS.length;

export type SelectionCheck = { ok: true } | { ok: false; reason: 'poucas' | 'muitas'; message: string };

export function checkRecipeSelection(count: number, rules: PlannerRules): SelectionCheck {
  if (count < rules.minRecipes) {
    return {
      ok: false,
      reason: 'poucas',
      message: `Escolha pelo menos ${rules.minRecipes} receitas (faltam ${rules.minRecipes - count}).`,
    };
  }
  if (count > rules.maxRecipes) {
    return { ok: false, reason: 'muitas', message: `Escolha no máximo ${rules.maxRecipes} receitas.` };
  }
  return { ok: true };
}

/** Adiciona ou remove uma receita, respeitando o limite máximo. Devolve a nova lista. */
export function toggleRecipe(selected: ID[], recipeId: ID, rules: PlannerRules): ID[] {
  if (selected.includes(recipeId)) return selected.filter((id) => id !== recipeId);
  if (selected.length >= rules.maxRecipes) return selected;
  return [...selected, recipeId];
}

/** Ao remover receitas da seleção, limpa referências nas etapas seguintes. */
export function pruneWeek(week: PlannerWeek): PlannerWeek {
  const keep = new Set(week.recipeIds);
  const prepStatus: Record<ID, PrepStatus> = {};
  for (const [id, status] of Object.entries(week.prepStatus)) if (keep.has(id)) prepStatus[id] = status;
  const days = { ...week.days };
  for (const d of WEEK_DAYS) days[d] = { ...days[d], recipeIds: days[d].recipeIds.filter((id) => keep.has(id)) };
  return { ...week, prepStatus, days };
}

export function canAdvance(step: number, week: PlannerWeek, rules: PlannerRules): SelectionCheck {
  switch (step) {
    case 1:
      return checkRecipeSelection(week.recipeIds.length, rules);
    case 2: {
      const missing = week.recipeIds.filter((id) => !week.prepStatus[id]).length;
      return missing === 0
        ? { ok: true }
        : { ok: false, reason: 'poucas', message: `Indique o preparo de ${missing} receita(s).` };
    }
    case 3: {
      const empty = WEEK_DAYS.filter((d) => week.days[d].recipeIds.length === 0).length;
      return empty === 0
        ? { ok: true }
        : { ok: false, reason: 'poucas', message: `Ainda há ${empty} dia(s) sem receita.` };
    }
    default:
      return { ok: true };
  }
}

export interface ShoppingItem {
  ingredientId: ID;
  name: string;
  /** Quantidades somadas por unidade, ex.: { xic: 2.5, un: 3 }. */
  quantities: Record<string, number>;
  recipeIds: ID[];
}

/**
 * Ingredientes necessários: apenas das receitas marcadas como "preparar".
 * Retorna a lista completa (para a etapa 5) — use `buildShoppingList` para
 * descontar o que já há em casa.
 */
export function aggregateIngredients(week: PlannerWeek, recipes: Recipe[]): ShoppingItem[] {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const items = new Map<ID, ShoppingItem>();
  for (const recipeId of week.recipeIds) {
    if (week.prepStatus[recipeId] !== 'preparar') continue;
    const recipe = byId.get(recipeId);
    if (!recipe) continue;
    for (const ing of recipe.ingredients) {
      const item =
        items.get(ing.ingredientId) ??
        ({ ingredientId: ing.ingredientId, name: ing.name, quantities: {}, recipeIds: [] } as ShoppingItem);
      if (ing.quantity != null && ing.unitId) {
        item.quantities[ing.unitId] = round2((item.quantities[ing.unitId] ?? 0) + ing.quantity);
      }
      if (!item.recipeIds.includes(recipeId)) item.recipeIds.push(recipeId);
      items.set(ing.ingredientId, item);
    }
  }
  return [...items.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function buildShoppingList(week: PlannerWeek, recipes: Recipe[]): ShoppingItem[] {
  const pantry = new Set(week.pantryIngredientIds);
  return aggregateIngredients(week, recipes).filter((i) => !pantry.has(i.ingredientId));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const FRACTIONS: Record<string, string> = { '0.25': '¼', '0.33': '⅓', '0.5': '½', '0.66': '⅔', '0.75': '¾' };

/** Formata 1.5 → "1 ½", 0.33 → "⅓", 2 → "2". */
export function formatQuantity(q: number): string {
  const whole = Math.floor(q);
  const frac = round2(q - whole);
  const fracLabel = FRACTIONS[String(frac)];
  if (frac === 0) return String(whole);
  if (fracLabel) return whole > 0 ? `${whole} ${fracLabel}` : fracLabel;
  return q.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
