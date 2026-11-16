/**
 * Modelos de domínio compartilhados pelo app.
 * Eles descrevem o "contrato" que os serviços (demonstrativos hoje, Supabase na
 * Fase 2) devem devolver. Nenhum campo aqui concede acesso por si só: direitos
 * de acesso serão decididos pelo servidor.
 */

export type ID = string;

export interface RecipeCategory {
  id: ID;
  name: string;
  emoji: string;
  sortOrder: number;
}

export interface Unit {
  id: ID;
  /** Forma curta, ex.: "xíc.", "g", "colher (sopa)". */
  abbreviation: string;
}

export interface RecipeIngredient {
  /** Referência única do ingrediente (compartilhada com a lista de compras). */
  ingredientId: ID;
  name: string;
  quantity: number | null;
  unitId: ID | null;
  note?: string;
}

export interface RecipeStep {
  order: number;
  text: string;
}

export type FreezingInfo = { freezable: false } | { freezable: true; maxDays: number; howTo: string };

export interface RecipeSummary {
  id: ID;
  title: string;
  shortDescription: string;
  categoryIds: ID[];
  prepMinutes: number;
  yieldLabel: string;
  freezable: boolean;
  isOfficial: boolean;
  /** true = exige assinatura do Clube. Decisão final de acesso é do servidor. */
  isExclusive: boolean;
  coverEmoji: string;
  coverUri?: string;
  publishedAt: string;
}

export interface RecipeVideo {
  /** No futuro: ID do vídeo no Cloudflare Stream. O token é obtido no servidor. */
  providerVideoId: string;
  durationSeconds: number;
}

export interface Recipe extends RecipeSummary {
  description: string;
  video: RecipeVideo | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  freezing: FreezingInfo;
  tips: string[];
}

export interface RecipeQuestion {
  id: ID;
  recipeId: ID;
  authorPublicName: string;
  text: string;
  createdAt: string;
  answer?: { authorPublicName: string; text: string; isOfficial: boolean };
}

// ---------- Planejador ----------

export const WEEK_DAYS = ['seg', 'ter', 'qua', 'qui', 'sex'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
};

export type PrepStatus = 'preparar' | 'pronta';

export type SideItemKind = 'fruta' | 'proteina' | 'acompanhamento';

export interface SideItem {
  id: ID;
  kind: SideItemKind;
  name: string;
  emoji: string;
}

export type PlannerStatus = 'rascunho' | 'ativo' | 'arquivado';

export interface PlannerWeek {
  id: ID;
  title: string;
  /** Data (AAAA-MM-DD) da segunda-feira da semana. */
  weekStart: string;
  status: PlannerStatus;
  /** Última etapa alcançada (1 a 6). */
  currentStep: number;
  recipeIds: ID[];
  prepStatus: Record<ID, PrepStatus>;
  days: Record<WeekDay, { recipeIds: ID[]; sideItemIds: ID[] }>;
  /** IDs de ingredientes que a família já tem em casa. */
  pantryIngredientIds: ID[];
  updatedAt: string;
}

export interface PlannerRules {
  minRecipes: number;
  maxRecipes: number;
}

// ---------- Comunidade ----------

export type PostKind = 'relato' | 'pergunta' | 'dica' | 'minha-receita';

export interface PublicProfile {
  id: ID;
  publicName: string;
  avatarInitials: string;
}

export interface CommunityComment {
  id: ID;
  author: PublicProfile;
  text: string;
  createdAt: string;
}

export interface CommunityPost {
  id: ID;
  author: PublicProfile;
  kind: PostKind;
  text: string;
  imageEmojis: string[];
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  comments: CommunityComment[];
  /** Publicações criadas no protótipo nunca saem do aparelho. */
  isLocalDemo?: boolean;
}

// ---------- Perfil e assinatura ----------

export type SubscriptionState =
  | 'nenhuma'
  | 'ativa'
  | 'em_recuperacao' // falha no pagamento, período de carência da loja
  | 'cancelada_ate_fim' // cancelada, mas com acesso até o fim do período
  | 'expirada';

export type StorePlatform = 'apple' | 'google';

/**
 * Visão de assinatura apresentada na interface. No app real ela será obtida
 * do servidor (fonte confiável de direitos), nunca calculada no aparelho.
 */
export interface SubscriptionView {
  state: SubscriptionState;
  platform: StorePlatform | null;
  currentPeriodEnd: string | null;
}

export interface Plan {
  id: ID;
  name: string;
  priceLabel: string;
  periodLabel: string;
  benefits: string[];
}

export interface PrivateProfile {
  id: ID;
  fullName: string;
  publicName: string;
  /** Privado: nunca exibido para outras pessoas. */
  email: string;
  createdAt: string;
  avatarInitials: string;
}

export interface AppNotification {
  id: ID;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}
