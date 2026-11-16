import type { Unit } from '@/domain/models';

import { formatDuration, formatIngredient, formatMinutes, normalizeSearch } from './recipes';

const units: Unit[] = [
  { id: 'unidade', abbreviation: 'un.', singular: 'unidade', plural: 'unidades' },
  { id: 'xicara', abbreviation: 'xíc.', singular: 'xícara', plural: 'xícaras' },
  { id: 'colher_cha', abbreviation: 'c. chá', singular: 'colher de chá', plural: 'colheres de chá' },
];

describe('formatIngredient', () => {
  it('omite a unidade "unidade"', () => {
    expect(formatIngredient({ ingredientId: '1', name: 'ovos', quantity: 2, unitId: 'unidade' }, units)).toBe('2 ovos');
  });
  it('usa singular e plural da unidade', () => {
    expect(
      formatIngredient({ ingredientId: '1', name: 'farinha de aveia', quantity: 1, unitId: 'xicara' }, units),
    ).toBe('1 xícara de farinha de aveia');
    expect(formatIngredient({ ingredientId: '1', name: 'leite', quantity: 2, unitId: 'xicara' }, units)).toBe(
      '2 xícaras de leite',
    );
    expect(formatIngredient({ ingredientId: '1', name: 'açúcar', quantity: 0.5, unitId: 'xicara' }, units)).toBe(
      '½ xícara de açúcar',
    );
  });
  it('sem quantidade mostra só o nome e a observação', () => {
    expect(
      formatIngredient({ ingredientId: '1', name: 'Sal', quantity: null, unitId: null, note: 'a gosto' }, units),
    ).toBe('Sal (a gosto)');
  });
});

describe('formatação', () => {
  it('normaliza a busca como o banco', () => {
    expect(normalizeSearch('  Pão  de QUEIJO ')).toBe('pao de queijo');
  });
  it('tempos e durações', () => {
    expect(formatMinutes(35)).toBe('35 min');
    expect(formatMinutes(90)).toBe('1 h 30 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(null)).toBeNull();
  });
});
