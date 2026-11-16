/** Regras de apresentação das receitas (puras e testáveis). */
import type { RecipeIngredient, Unit } from '@/domain/models';

import { formatQuantity } from './planner';

/** Mesma normalização usada no banco (coluna `busca`): sem acento, minúsculas, espaços simples. */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Monta a linha do ingrediente em português:
 *   2 Ovos · 1 xícara de Farinha de aveia · 2 colheres de sopa de Mel · Sal (a gosto)
 */
export function formatIngredient(ing: RecipeIngredient, units: Unit[]): string {
  const note = ing.note ? ` (${ing.note})` : '';
  if (ing.quantity == null) return `${ing.name}${note}`;
  const qty = formatQuantity(ing.quantity);
  const unit = ing.unitId ? units.find((u) => u.id === ing.unitId) : undefined;
  if (!unit || unit.id === 'unidade' || unit.id === 'un') return `${qty} ${ing.name}${note}`;
  const plural = ing.quantity > 1;
  const unitName = (plural ? unit.plural : unit.singular) ?? unit.abbreviation;
  return `${qty} ${unitName} de ${ing.name}${note}`;
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
