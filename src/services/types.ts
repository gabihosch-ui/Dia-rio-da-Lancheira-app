/**
 * Contratos dos serviços de dados. Há duas implementações:
 *  - `demo.ts`: dados fictícios em memória (modo demonstração, sem .env);
 *  - `supabase-recipes.ts`: biblioteca real no Supabase do app.
 * As telas dependem apenas destes contratos.
 */
import type {
  AppNotification,
  ClubAccess,
  CommunityPost,
  Plan,
  PlannerRecipeSource,
  RecipeCategory,
  RecipeDetail,
  RecipeQuestion,
  RecipeSummary,
  SideItem,
  Unit,
} from '@/domain/models';

/** Filtros do catálogo. Novos filtros (ex.: sem leite) só com dados cadastrados e revisados. */
export interface RecipeQuery {
  text?: string;
  categoryId?: string | null;
  freezableOnly?: boolean;
  quickOnly?: boolean;
  favoritesOnly?: boolean;
}

export interface Page<T> {
  items: T[];
  hasMore: boolean;
}

export const RECIPES_PAGE_SIZE = 20;

export type VideoTokenResult =
  | { ok: true; url: string; expiresAt: string }
  | { ok: false; reason: 'unavailable' | 'not_configured' | 'denied' | 'rate_limited' | 'error' };

export interface RecipesService {
  listCategories(): Promise<RecipeCategory[]>;
  listUnits(): Promise<Unit[]>;
  /** Receitas publicadas, mais recentes primeiro, paginadas (página começa em 0). */
  search(query: RecipeQuery, page: number): Promise<Page<RecipeSummary>>;
  listFeatured(limit: number): Promise<RecipeSummary[]>;
  /** Metadados + conteúdo; `content` vem null quando o servidor bloqueia. */
  getDetail(id: string): Promise<RecipeDetail | null>;
  listQuestions(recipeId: string): Promise<RecipeQuestion[]>;
  listFavoriteIds(): Promise<string[]>;
  setFavorite(recipeId: string, favorite: boolean): Promise<void>;
  getMyAccess(): Promise<ClubAccess>;
  requestVideo(recipeId: string): Promise<VideoTokenResult>;
  /** Contrato para o Planejador (próxima fase). */
  getForPlanner(recipeIds: string[]): Promise<PlannerRecipeSource[]>;
}

export interface CommunityService {
  listPosts(): Promise<CommunityPost[]>;
  getPost(id: string): Promise<CommunityPost | null>;
}

export interface CatalogService {
  getPlan(): Promise<Plan>;
  listSideItems(): Promise<SideItem[]>;
  listNotifications(): Promise<AppNotification[]>;
}

export interface Services {
  recipes: RecipesService;
  community: CommunityService;
  catalog: CatalogService;
}

/** Erro padronizado exibido nas telas (mensagem amigável, sem detalhes técnicos). */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'network' | 'not_found' | 'forbidden' | 'unknown' = 'unknown',
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}
