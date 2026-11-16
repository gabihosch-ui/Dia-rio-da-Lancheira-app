/**
 * Estado da biblioteca na sessão: favoritos (persistidos no servidor) e a
 * situação de acesso ao Clube (informada pelo servidor). A proteção do
 * conteúdo é feita pela RLS — este estado serve só para a interface.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { ClubAccess } from '@/domain/models';
import { notify } from '@/lib/notify';
import { services, USING_REAL_RECIPES } from '@/services';
import { demoRuntime } from '@/services/demo';
import { useAuth } from '@/state/auth';
import { useDemoStore } from '@/state/demo-store';

interface LibraryValue {
  access: ClubAccess;
  favorites: Set<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => Promise<void>;
  refresh: () => void;
}

const NO_ACCESS: ClubAccess = { hasAccess: false, origin: null, validUntil: null };
const Ctx = createContext<LibraryValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { subscription } = useDemoStore();
  const userId = session?.user.id ?? null;
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [access, setAccess] = useState<ClubAccess>(NO_ACCESS);
  const [version, setVersion] = useState(0);

  // Modo demonstração: o simulador da tela de assinatura define o acesso fictício.
  const demoAccess =
    subscription.state === 'ativa' ||
    subscription.state === 'em_recuperacao' ||
    subscription.state === 'cancelada_ate_fim';
  useEffect(() => {
    if (!USING_REAL_RECIPES) demoRuntime.hasClubAccess = demoAccess;
  }, [demoAccess]);

  useEffect(() => {
    if (USING_REAL_RECIPES && !userId) return;
    let cancelled = false;
    Promise.all([services.recipes.listFavoriteIds(), services.recipes.getMyAccess()]).then(
      ([ids, acc]) => {
        if (cancelled) return;
        setFavorites(new Set(ids));
        setAccess(acc);
      },
      () => {
        // Sem conexão: mantém o estado anterior; as telas mostram seus próprios erros.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, version, demoAccess]);

  const toggleFavorite = useCallback(
    async (id: string) => {
      const next = !favorites.has(id);
      // Atualização otimista, desfeita se o servidor recusar.
      setFavorites((prev) => {
        const s = new Set(prev);
        if (next) s.add(id);
        else s.delete(id);
        return s;
      });
      try {
        await services.recipes.setFavorite(id, next);
      } catch {
        setFavorites((prev) => {
          const s = new Set(prev);
          if (next) s.delete(id);
          else s.add(id);
          return s;
        });
        notify('Não foi possível', 'Seus favoritos não foram atualizados. Tente novamente.');
      }
    },
    [favorites],
  );

  const value = useMemo<LibraryValue>(
    () => ({
      access: USING_REAL_RECIPES
        ? userId
          ? access
          : NO_ACCESS
        : { ...NO_ACCESS, hasAccess: demoAccess, origin: demoAccess ? 'demo' : null },
      favorites,
      isFavorite: (id) => favorites.has(id),
      toggleFavorite,
      refresh: () => setVersion((v) => v + 1),
    }),
    [access, favorites, toggleFavorite, userId, demoAccess],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLibrary(): LibraryValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLibrary precisa estar dentro de LibraryProvider');
  return ctx;
}
