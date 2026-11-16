/**
 * Estado local do PROTÓTIPO (Fase 1). Tudo fica apenas em memória e some ao
 * fechar o app. Não representa segurança: o "estado da assinatura" aqui serve
 * só para visualizar as telas de assinante e não-assinante. No app real, o
 * direito de acesso virá do servidor e será verificado no backend/RLS.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { createEmptyWeek, demoMe, demoPlannerRules, demoPlannerWeeks } from '@/data/demo/misc';
import type {
  CommunityPost,
  PlannerRules,
  PlannerWeek,
  PostKind,
  PrivateProfile,
  SubscriptionView,
} from '@/domain/models';
import { demoRuntime } from '@/services/demo';

type DemoSubscription = SubscriptionView['state'];

const SUBSCRIPTION_VIEWS: Record<DemoSubscription, SubscriptionView> = {
  nenhuma: { state: 'nenhuma', platform: null, currentPeriodEnd: null },
  ativa: { state: 'ativa', platform: 'google', currentPeriodEnd: '2026-12-16' },
  em_recuperacao: { state: 'em_recuperacao', platform: 'apple', currentPeriodEnd: '2026-11-20' },
  cancelada_ate_fim: { state: 'cancelada_ate_fim', platform: 'apple', currentPeriodEnd: '2026-11-30' },
  expirada: { state: 'expirada', platform: 'google', currentPeriodEnd: '2026-11-01' },
};

interface DemoStore {
  me: PrivateProfile;
  subscription: SubscriptionView;
  /** Apenas para a interface do protótipo. NÃO é verificação de acesso. */
  demoHasClubAccess: boolean;
  setDemoSubscription: (s: DemoSubscription) => void;

  simulateErrors: boolean;
  setSimulateErrors: (v: boolean) => void;

  favorites: Set<string>;
  toggleFavorite: (recipeId: string) => void;

  plannerRules: PlannerRules;
  weeks: PlannerWeek[];
  getWeek: (id: string) => PlannerWeek | undefined;
  createWeek: () => PlannerWeek;
  saveWeek: (week: PlannerWeek) => void;
  setWeekStatus: (id: string, status: PlannerWeek['status']) => void;
  addRecipeToWeek: (weekId: string, recipeId: string) => 'adicionada' | 'ja-existe' | 'limite';

  localPosts: CommunityPost[];
  likes: Record<string, boolean>;
  toggleLike: (post: CommunityPost) => void;
  isLiked: (post: CommunityPost) => boolean;
  addLocalPost: (kind: PostKind, text: string) => void;
}

const Ctx = createContext<DemoStore | null>(null);

function nextMonday(from: Date): string {
  const d = new Date(from);
  const diff = (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [subState, setSubState] = useState<DemoSubscription>('nenhuma');
  const [simulateErrors, setSimErr] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(['r-muffin-banana']));
  const [weeks, setWeeks] = useState<PlannerWeek[]>(demoPlannerWeeks);
  const [localPosts, setLocalPosts] = useState<CommunityPost[]>([]);
  const [likes, setLikes] = useState<Record<string, boolean>>({});

  const setSimulateErrors = useCallback((v: boolean) => {
    demoRuntime.simulateErrors = v;
    setSimErr(v);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const getWeek = useCallback((id: string) => weeks.find((w) => w.id === id), [weeks]);

  const createWeek = useCallback(() => {
    const start = nextMonday(new Date());
    const [, m, d] = start.split('-');
    const week = createEmptyWeek(`w-${Date.now()}`, start, `Semana de ${d}/${m}`);
    setWeeks((prev) => [week, ...prev]);
    return week;
  }, []);

  const saveWeek = useCallback((week: PlannerWeek) => {
    const updated = { ...week, updatedAt: new Date().toISOString() };
    setWeeks((prev) => prev.map((w) => (w.id === week.id ? updated : w)));
  }, []);

  const setWeekStatus = useCallback((id: string, status: PlannerWeek['status']) => {
    setWeeks((prev) => prev.map((w) => (w.id === id ? { ...w, status, updatedAt: new Date().toISOString() } : w)));
  }, []);

  const addRecipeToWeek = useCallback(
    (weekId: string, recipeId: string) => {
      const week = weeks.find((w) => w.id === weekId);
      if (!week) return 'limite' as const;
      if (week.recipeIds.includes(recipeId)) return 'ja-existe' as const;
      if (week.recipeIds.length >= demoPlannerRules.maxRecipes) return 'limite' as const;
      saveWeek({ ...week, recipeIds: [...week.recipeIds, recipeId] });
      return 'adicionada' as const;
    },
    [weeks, saveWeek],
  );

  const isLiked = useCallback((post: CommunityPost) => likes[post.id] ?? post.likedByMe, [likes]);
  const toggleLike = useCallback((post: CommunityPost) => {
    setLikes((prev) => ({ ...prev, [post.id]: !(prev[post.id] ?? post.likedByMe) }));
  }, []);

  const addLocalPost = useCallback((kind: PostKind, text: string) => {
    const post: CommunityPost = {
      id: `local-${Date.now()}`,
      author: { id: demoMe.id, publicName: demoMe.publicName, avatarInitials: demoMe.avatarInitials },
      kind,
      text,
      imageEmojis: [],
      createdAt: new Date().toISOString(),
      likeCount: 0,
      likedByMe: false,
      comments: [],
      isLocalDemo: true,
    };
    setLocalPosts((prev) => [post, ...prev]);
  }, []);

  const subscription = SUBSCRIPTION_VIEWS[subState];
  const demoHasClubAccess = subState === 'ativa' || subState === 'em_recuperacao' || subState === 'cancelada_ate_fim';

  const value = useMemo<DemoStore>(
    () => ({
      me: demoMe,
      subscription,
      demoHasClubAccess,
      setDemoSubscription: setSubState,
      simulateErrors,
      setSimulateErrors,
      favorites,
      toggleFavorite,
      plannerRules: demoPlannerRules,
      weeks,
      getWeek,
      createWeek,
      saveWeek,
      setWeekStatus,
      addRecipeToWeek,
      localPosts,
      likes,
      toggleLike,
      isLiked,
      addLocalPost,
    }),
    [
      subscription,
      demoHasClubAccess,
      simulateErrors,
      setSimulateErrors,
      favorites,
      toggleFavorite,
      weeks,
      getWeek,
      createWeek,
      saveWeek,
      setWeekStatus,
      addRecipeToWeek,
      localPosts,
      likes,
      toggleLike,
      isLiked,
      addLocalPost,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemoStore(): DemoStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDemoStore precisa estar dentro de DemoStoreProvider');
  return ctx;
}
