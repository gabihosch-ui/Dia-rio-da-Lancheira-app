import { describe, expect, it } from 'vitest';

import { emptyForm, move, parseQuantity, slugify, toPayload, validateRecipe, type RecipeForm } from './validation';

function valid(): RecipeForm {
  return {
    ...emptyForm(),
    titulo: 'Bolinho de Cenoura',
    tempo_preparo_min: '40',
    ingredientes: [{ nome: 'Cenoura', quantidade: '2', unidade_id: 'unidade', observacao: '' }],
    passos: ['Bata tudo', 'Asse'],
  };
}

describe('validação do formulário de receita', () => {
  it('aceita uma receita completa', () => {
    expect(validateRecipe(valid(), true)).toEqual({});
  });
  it('recusa título curto e tempo inválido', () => {
    const e = validateRecipe({ ...valid(), titulo: 'ab', tempo_preparo_min: '-3' });
    expect(e.titulo).toBeDefined();
    expect(e.tempo_preparo_min).toBeDefined();
  });
  it('exige ingrediente e etapa para publicar', () => {
    const e = validateRecipe({ ...valid(), ingredientes: [], passos: ['  '] }, true);
    expect(e.ingredientes).toBeDefined();
    expect(e.passos).toBeDefined();
  });
  it('exige prazo de congelamento quando congela', () => {
    expect(validateRecipe({ ...valid(), pode_congelar: true }).congelamento).toBeDefined();
  });
  it('recusa quantidade inválida e unidade sem quantidade', () => {
    const e = validateRecipe({
      ...valid(),
      ingredientes: [
        { nome: 'Leite', quantidade: 'muito', unidade_id: 'xicara', observacao: '' },
        { nome: 'Sal', quantidade: '', unidade_id: 'g', observacao: '' },
      ],
    });
    expect(e['ingrediente.0']).toBeDefined();
    expect(e['ingrediente.1']).toBeDefined();
  });
  it('recusa ID de vídeo com caracteres estranhos', () => {
    const f = valid();
    f.video.provider_video_id = '../../etc';
    expect(validateRecipe(f).video).toBeDefined();
  });
});

describe('conversões', () => {
  it('quantidades com vírgula e frações', () => {
    expect(parseQuantity('1,5')).toBe(1.5);
    expect(parseQuantity('1/2')).toBe(0.5);
    expect(parseQuantity('1 1/2')).toBe(1.5);
    expect(parseQuantity('')).toBeNull();
    expect(parseQuantity('0')).toBe('invalid');
  });
  it('slug sem acentos', () => {
    expect(slugify('Pão de Queijo da Vovó!')).toBe('pao-de-queijo-da-vovo');
  });
  it('payload ignora linhas vazias e numera na ordem', () => {
    const f = valid();
    f.ingredientes.push({ nome: '', quantidade: '', unidade_id: '', observacao: '' });
    f.passos.push('');
    const p = toPayload(f);
    expect(p.ingredientes).toHaveLength(1);
    expect(p.passos).toEqual(['Bata tudo', 'Asse']);
    expect(p.slug).toBe('bolinho-de-cenoura');
    expect(p.congelamento).toBeNull();
  });
  it('move itens', () => {
    expect(move(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(move(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
  });
});
