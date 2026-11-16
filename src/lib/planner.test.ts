import { createEmptyWeek, demoPlannerRules } from '@/data/demo/misc';
import { demoRecipes } from '@/data/demo/recipes';

import {
  aggregateIngredients,
  buildShoppingList,
  canAdvance,
  checkRecipeSelection,
  formatQuantity,
  pruneWeek,
  toggleRecipe,
} from './planner';

const rules = demoPlannerRules;

describe('seleção de receitas (2 a 5)', () => {
  it('exige o mínimo e respeita o máximo', () => {
    expect(checkRecipeSelection(1, rules).ok).toBe(false);
    expect(checkRecipeSelection(2, rules).ok).toBe(true);
    expect(checkRecipeSelection(5, rules).ok).toBe(true);
    expect(checkRecipeSelection(6, rules).ok).toBe(false);
  });

  it('não adiciona além do limite máximo', () => {
    const full = ['a', 'b', 'c', 'd', 'e'];
    expect(toggleRecipe(full, 'f', rules)).toEqual(full);
    expect(toggleRecipe(full, 'a', rules)).toEqual(['b', 'c', 'd', 'e']);
  });
});

describe('pruneWeek', () => {
  it('remove referências a receitas desmarcadas', () => {
    const week = createEmptyWeek('w', '2026-11-16', 't');
    week.recipeIds = ['r1'];
    week.prepStatus = { r1: 'preparar', r2: 'pronta' };
    week.days.seg.recipeIds = ['r1', 'r2'];
    const pruned = pruneWeek(week);
    expect(pruned.prepStatus).toEqual({ r1: 'preparar' });
    expect(pruned.days.seg.recipeIds).toEqual(['r1']);
  });
});

describe('canAdvance', () => {
  it('bloqueia a etapa 2 sem status de preparo', () => {
    const week = createEmptyWeek('w', '2026-11-16', 't');
    week.recipeIds = ['r1', 'r2'];
    week.prepStatus = { r1: 'pronta' };
    expect(canAdvance(2, week, rules).ok).toBe(false);
    week.prepStatus.r2 = 'preparar';
    expect(canAdvance(2, week, rules).ok).toBe(true);
  });
});

describe('lista de compras', () => {
  const week = createEmptyWeek('w', '2026-11-16', 't');
  week.recipeIds = ['r-muffin-banana', 'r-panquequinha', 'r-pao-queijo'];
  week.prepStatus = { 'r-muffin-banana': 'preparar', 'r-panquequinha': 'preparar', 'r-pao-queijo': 'pronta' };

  it('soma ingredientes repetidos e ignora receitas já prontas', () => {
    const items = aggregateIngredients(week, demoRecipes);
    const ovo = items.find((i) => i.ingredientId === 'ovo');
    expect(ovo?.quantities.un).toBe(4);
    expect(items.find((i) => i.ingredientId === 'polvilho-azedo')).toBeUndefined();
  });

  it('desconta o que já há na despensa', () => {
    const list = buildShoppingList({ ...week, pantryIngredientIds: ['ovo'] }, demoRecipes);
    expect(list.find((i) => i.ingredientId === 'ovo')).toBeUndefined();
    expect(list.find((i) => i.ingredientId === 'banana')?.quantities.un).toBe(5);
  });
});

describe('formatQuantity', () => {
  it('usa frações amigáveis', () => {
    expect(formatQuantity(2)).toBe('2');
    expect(formatQuantity(0.5)).toBe('½');
    expect(formatQuantity(1.5)).toBe('1 ½');
    expect(formatQuantity(0.33)).toBe('⅓');
  });
});
