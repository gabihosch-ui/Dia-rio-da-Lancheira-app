import { useCallback, useEffect, useState } from 'react';

import type { RecipeSummary } from '@/domain/models';
import { services, type RecipeQuery } from '@/services';

type State =
  | { status: 'loading'; items: RecipeSummary[] }
  | { status: 'ready'; items: RecipeSummary[]; hasMore: boolean; loadingMore: boolean; moreError: boolean }
  | { status: 'error'; items: RecipeSummary[]; message: string };

/** Busca paginada do catálogo. Recomeça da primeira página quando os filtros mudam. */
export function useRecipeSearch(query: RecipeQuery) {
  const key = JSON.stringify(query);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; page: number; state: State } | null>(null);

  useEffect(() => {
    let cancelled = false;
    services.recipes.search(JSON.parse(key) as RecipeQuery, 0).then(
      (p) => {
        if (!cancelled)
          setResult({
            key,
            page: 0,
            state: { status: 'ready', items: p.items, hasMore: p.hasMore, loadingMore: false, moreError: false },
          });
      },
      (e: unknown) => {
        if (!cancelled)
          setResult({
            key,
            page: 0,
            state: { status: 'error', items: [], message: e instanceof Error ? e.message : 'Erro ao carregar.' },
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, attempt]);

  const state: State = result && result.key === key ? result.state : { status: 'loading', items: [] };

  const loadMore = useCallback(() => {
    if (!result || result.key !== key) return;
    const s = result.state;
    if (s.status !== 'ready' || !s.hasMore || s.loadingMore) return;
    const nextPage = result.page + 1;
    setResult({ ...result, state: { ...s, loadingMore: true, moreError: false } });
    services.recipes.search(JSON.parse(key) as RecipeQuery, nextPage).then(
      (p) =>
        setResult((cur) =>
          cur && cur.key === key && cur.state.status === 'ready'
            ? {
                key,
                page: nextPage,
                state: {
                  status: 'ready',
                  items: [...cur.state.items, ...p.items.filter((x) => !cur.state.items.some((y) => y.id === x.id))],
                  hasMore: p.hasMore,
                  loadingMore: false,
                  moreError: false,
                },
              }
            : cur,
        ),
      () =>
        setResult((cur) =>
          cur && cur.key === key && cur.state.status === 'ready'
            ? { ...cur, state: { ...cur.state, loadingMore: false, moreError: true } }
            : cur,
        ),
    );
  }, [result, key]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, loadMore, reload };
}
