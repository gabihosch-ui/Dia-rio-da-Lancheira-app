/**
 * Contratos dos serviços de dados. Na Fase 1 existe apenas a implementação
 * demonstrativa (`./demo`). Na Fase 2 entra uma implementação Supabase com a
 * mesma interface, sem que as telas precisem mudar.
 */
import type {
  AppNotification,
  CommunityPost,
  Plan,
  Recipe,
  RecipeCategory,
  RecipeQuestion,
  RecipeSummary,
  SideItem,
  Unit,
} from '@/domain/models';

export interface RecipeQuery {
  text?: string;
  categoryId?: string | null;
  freezableOnly?: boolean;
  quickOnly?: boolean;
}

export interface RecipesService {
  listCategories(): Promise<RecipeCategory[]>;
  listUnits(): Promise<Unit[]>;
  search(query: RecipeQuery): Promise<RecipeSummary[]>;
  /** Na versão real, o servidor omitirá vídeo/ingredientes/preparo sem assinatura válida. */
  getById(id: string): Promise<Recipe | null>;
  listAllFull(): Promise<Recipe[]>;
  listQuestions(recipeId: string): Promise<RecipeQuestion[]>;
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
