import { useCallback, useEffect, useEffectEvent, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading'; data: undefined; error: undefined }
  | { status: 'success'; data: T; error: undefined }
  | { status: 'error'; data: undefined; error: Error };

const LOADING = { status: 'loading', data: undefined, error: undefined } as const;

/**
 * Executa uma função assíncrona e expõe carregamento, erro e dados.
 * `deps` (valores simples, serializáveis) controla quando recarregar;
 * `reload()` atende ao botão "Tentar novamente".
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly (string | number | boolean | null | undefined)[]) {
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([...deps, attempt]);
  const [settled, setSettled] = useState<{ key: string; state: AsyncState<T> } | null>(null);
  const run = useEffectEvent(() => fn());

  useEffect(() => {
    let cancelled = false;
    run()
      .then((data) => {
        if (!cancelled) setSettled({ key, state: { status: 'success', data, error: undefined } });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const error = e instanceof Error ? e : new Error('Erro inesperado.');
        setSettled({ key, state: { status: 'error', data: undefined, error } });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const state: AsyncState<T> = settled && settled.key === key ? settled.state : LOADING;
  return { ...state, reload };
}
