/**
 * DADOS DEMONSTRATIVOS — Fase 1.
 * Pessoas, publicações e planejamentos fictícios. Nenhum dado real de cliente.
 */
import type {
  AppNotification,
  CommunityPost,
  Plan,
  PlannerRules,
  PlannerWeek,
  PrivateProfile,
  PublicProfile,
  RecipeQuestion,
  SideItem,
} from '@/domain/models';

export const demoMe: PrivateProfile = {
  id: 'u-demo',
  fullName: 'Ana Demonstração',
  publicName: 'Ana D.',
  email: 'ana.demo@exemplo.com',
  createdAt: '2026-09-01',
  avatarInitials: 'AD',
};

const mePublic: PublicProfile = { id: demoMe.id, publicName: demoMe.publicName, avatarInitials: 'AD' };
const julia: PublicProfile = { id: 'u-julia', publicName: 'Júlia M.', avatarInitials: 'JM' };
const carla: PublicProfile = { id: 'u-carla', publicName: 'Carla S.', avatarInitials: 'CS' };
const equipe: PublicProfile = { id: 'u-equipe', publicName: 'Equipe Diário da Lancheira', avatarInitials: 'DL' };

export const demoPlan: Plan = {
  id: 'clube-mensal',
  name: 'Clube Diário da Lancheira',
  priceLabel: 'R$ 24,90',
  periodLabel: 'por mês',
  benefits: [
    'Receitas oficiais em vídeo',
    'Biblioteca completa de receitas do Clube',
    'Planejador semanal de lancheiras',
    'Comunidade: fotos, relatos e perguntas',
    'Receitas favoritas',
    'Novos conteúdos e atualizações',
  ],
};

/** Regra herdada do Planejador atual: de 2 a 5 receitas por semana (futuramente configurável). */
export const demoPlannerRules: PlannerRules = { minRecipes: 2, maxRecipes: 5 };

export const demoSideItems: SideItem[] = [
  { id: 'f-morango', kind: 'fruta', name: 'Morango', emoji: '🍓' },
  { id: 'f-uva', kind: 'fruta', name: 'Uva', emoji: '🍇' },
  { id: 'f-banana', kind: 'fruta', name: 'Banana', emoji: '🍌' },
  { id: 'f-maca', kind: 'fruta', name: 'Maçã', emoji: '🍎' },
  { id: 'f-mexerica', kind: 'fruta', name: 'Mexerica', emoji: '🍊' },
  { id: 'p-ovo', kind: 'proteina', name: 'Ovo cozido', emoji: '🥚' },
  { id: 'p-queijo', kind: 'proteina', name: 'Cubinhos de queijo', emoji: '🧀' },
  { id: 'p-iogurte', kind: 'proteina', name: 'Iogurte natural', emoji: '🥛' },
  { id: 'a-cenoura', kind: 'acompanhamento', name: 'Palitinhos de cenoura', emoji: '🥕' },
  { id: 'a-pepino', kind: 'acompanhamento', name: 'Rodelas de pepino', emoji: '🥒' },
  { id: 'a-castanha', kind: 'acompanhamento', name: 'Mix de sementes', emoji: '🌰' },
];

const emptyDays = (): PlannerWeek['days'] => ({
  seg: { recipeIds: [], sideItemIds: [] },
  ter: { recipeIds: [], sideItemIds: [] },
  qua: { recipeIds: [], sideItemIds: [] },
  qui: { recipeIds: [], sideItemIds: [] },
  sex: { recipeIds: [], sideItemIds: [] },
});

export function createEmptyWeek(id: string, weekStart: string, title: string): PlannerWeek {
  return {
    id,
    title,
    weekStart,
    status: 'rascunho',
    currentStep: 1,
    recipeIds: [],
    prepStatus: {},
    days: emptyDays(),
    pantryIngredientIds: [],
    updatedAt: new Date().toISOString(),
  };
}

export const demoPlannerWeeks: PlannerWeek[] = [
  {
    id: 'w-ativa',
    title: 'Semana de 16/11',
    weekStart: '2026-11-16',
    status: 'ativo',
    currentStep: 6,
    recipeIds: ['r-pao-queijo', 'r-muffin-banana', 'r-wrap-frango'],
    prepStatus: { 'r-pao-queijo': 'pronta', 'r-muffin-banana': 'preparar', 'r-wrap-frango': 'preparar' },
    days: {
      seg: { recipeIds: ['r-pao-queijo'], sideItemIds: ['f-morango', 'p-queijo'] },
      ter: { recipeIds: ['r-muffin-banana'], sideItemIds: ['f-uva', 'a-cenoura'] },
      qua: { recipeIds: ['r-wrap-frango'], sideItemIds: ['f-maca'] },
      qui: { recipeIds: ['r-pao-queijo'], sideItemIds: ['f-mexerica', 'p-iogurte'] },
      sex: { recipeIds: ['r-muffin-banana'], sideItemIds: ['f-banana', 'a-pepino'] },
    },
    pantryIngredientIds: ['ovo', 'oleo', 'sal'],
    updatedAt: '2026-11-15T20:10:00.000Z',
  },
  {
    id: 'w-rascunho',
    title: 'Semana de 23/11',
    weekStart: '2026-11-23',
    status: 'rascunho',
    currentStep: 2,
    recipeIds: ['r-bolinho-cenoura', 'r-esfiha-frango'],
    prepStatus: {},
    days: emptyDays(),
    pantryIngredientIds: [],
    updatedAt: '2026-11-15T21:00:00.000Z',
  },
  {
    id: 'w-arquivada',
    title: 'Semana de 09/11',
    weekStart: '2026-11-09',
    status: 'arquivado',
    currentStep: 6,
    recipeIds: ['r-panquequinha', 'r-cookie-cacau'],
    prepStatus: { 'r-panquequinha': 'preparar', 'r-cookie-cacau': 'pronta' },
    days: {
      seg: { recipeIds: ['r-panquequinha'], sideItemIds: ['f-uva'] },
      ter: { recipeIds: ['r-cookie-cacau'], sideItemIds: ['f-maca'] },
      qua: { recipeIds: ['r-panquequinha'], sideItemIds: ['f-banana'] },
      qui: { recipeIds: ['r-cookie-cacau'], sideItemIds: ['f-morango'] },
      sex: { recipeIds: ['r-panquequinha'], sideItemIds: ['f-mexerica'] },
    },
    pantryIngredientIds: ['ovo'],
    updatedAt: '2026-11-08T18:00:00.000Z',
  },
];

export const demoPosts: CommunityPost[] = [
  {
    id: 'p1',
    author: julia,
    kind: 'minha-receita',
    text: 'Fiz o pão de queijo de liquidificador no domingo e congelei tudo. A semana inteira resolvida! 🧀',
    imageEmojis: ['🧀', '🍱'],
    createdAt: '2026-11-16T09:15:00.000Z',
    likeCount: 24,
    likedByMe: false,
    comments: [
      { id: 'c1', author: carla, text: 'Ficou lindo! Quanto tempo no forno?', createdAt: '2026-11-16T10:00:00.000Z' },
      { id: 'c2', author: julia, text: 'Uns 25 minutos no meu forno.', createdAt: '2026-11-16T10:20:00.000Z' },
    ],
  },
  {
    id: 'p2',
    author: carla,
    kind: 'pergunta',
    text: 'Alguém já fez o muffin de banana trocando a farinha de trigo por farinha de arroz? Deu certo?',
    imageEmojis: [],
    createdAt: '2026-11-15T19:40:00.000Z',
    likeCount: 6,
    likedByMe: true,
    comments: [
      {
        id: 'c3',
        author: equipe,
        text: 'Funciona sim! Use a mesma quantidade e acrescente 1 colher de sopa de leite.',
        createdAt: '2026-11-15T20:30:00.000Z',
      },
    ],
  },
  {
    id: 'p3',
    author: equipe,
    kind: 'dica',
    text: 'Dica da semana: etiquete os potes do congelador com nome e data. Assim fica fácil saber o que usar primeiro.',
    imageEmojis: ['🏷️'],
    createdAt: '2026-11-14T12:00:00.000Z',
    likeCount: 41,
    likedByMe: false,
    comments: [],
  },
  {
    id: 'p4',
    author: mePublic,
    kind: 'relato',
    text: 'Primeira semana usando o Planejador. A lista de compras me salvou no mercado!',
    imageEmojis: ['🛒'],
    createdAt: '2026-11-13T08:30:00.000Z',
    likeCount: 12,
    likedByMe: false,
    comments: [],
  },
];

export const demoQuestions: RecipeQuestion[] = [
  {
    id: 'q1',
    recipeId: 'r-pao-queijo',
    authorPublicName: 'Carla S.',
    text: 'Posso usar polvilho doce no lugar do azedo?',
    createdAt: '2026-11-13T10:00:00.000Z',
    answer: {
      authorPublicName: 'Equipe Diário da Lancheira',
      text: 'Pode, mas o pão de queijo fica menos aerado. Uma boa opção é misturar metade de cada.',
      isOfficial: true,
    },
  },
  {
    id: 'q2',
    recipeId: 'r-muffin-banana',
    authorPublicName: 'Júlia M.',
    text: 'Dá para fazer em forma de bolo grande?',
    createdAt: '2026-11-11T15:00:00.000Z',
  },
];

export const demoNotifications: AppNotification[] = [
  {
    id: 'n1',
    title: 'Nova receita no Clube',
    body: 'Pão de queijo de liquidificador já está disponível.',
    createdAt: '2026-11-12T09:00:00.000Z',
    read: false,
  },
  {
    id: 'n2',
    title: 'Sua pergunta foi respondida',
    body: 'A Equipe Diário da Lancheira respondeu sobre o muffin de banana.',
    createdAt: '2026-11-11T18:00:00.000Z',
    read: false,
  },
  {
    id: 'n3',
    title: 'Planejamento em andamento',
    body: 'Você tem um rascunho para a semana de 23/11.',
    createdAt: '2026-11-10T08:00:00.000Z',
    read: true,
  },
];
