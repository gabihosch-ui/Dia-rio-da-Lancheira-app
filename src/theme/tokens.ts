/**
 * Tokens centrais do sistema de design do Diário da Lancheira.
 *
 * IMPORTANTE: os valores hexadecimais abaixo são PROVISÓRIOS, escolhidos a partir
 * da descrição da marca (azul-marinho, rosa, amarelo, fundo creme). Substituir
 * pelos códigos oficiais do manual da marca assim que forem enviados.
 * Nenhuma tela deve usar cores, tamanhos ou raios "soltos": sempre importar daqui.
 */

export const palette = {
  navy: '#1E2A5A',
  navySoft: '#3A4778',
  pink: '#E5487F',
  pinkSoft: '#FCE4EE',
  yellow: '#FFC83D',
  yellowSoft: '#FFF3CC',
  green: '#4FA672',
  greenSoft: '#E1F3E8',
  orange: '#F28C38',
  orangeSoft: '#FDEBDB',
  sky: '#5AB4E5',
  skySoft: '#E2F2FB',
  cream: '#FFFBF4',
  white: '#FFFFFF',
  gray900: '#1F2330',
  gray700: '#4A5065',
  gray500: '#7A8096',
  gray300: '#D5D8E1',
  gray200: '#E8EAF0',
  gray100: '#F4F5F8',
  danger: '#C73A3A',
  dangerSoft: '#FBE5E5',
} as const;

export const colors = {
  background: palette.cream,
  surface: palette.white,
  surfaceMuted: palette.gray100,
  border: palette.gray200,
  borderStrong: palette.gray300,

  textTitle: palette.navy,
  text: palette.gray900,
  textMuted: palette.gray700,
  textSubtle: palette.gray500,
  textOnPrimary: palette.navy,
  textOnAccent: palette.white,

  /** Botões principais e elementos importantes. */
  primary: palette.yellow,
  primarySoft: palette.yellowSoft,
  /** Destaques e interações (links, selecionados, curtidas). */
  accent: palette.pink,
  accentSoft: palette.pinkSoft,

  success: palette.green,
  successSoft: palette.greenSoft,
  warning: palette.orange,
  warningSoft: palette.orangeSoft,
  info: palette.sky,
  infoSoft: palette.skySoft,
  danger: palette.danger,
  dangerSoft: palette.dangerSoft,

  tabInactive: palette.gray500,
  tabActive: palette.pink,
  overlay: 'rgba(30, 42, 90, 0.55)',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Fonte do sistema por enquanto; a fonte oficial da marca entra quando enviada. */
export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
  subtitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '700' },
  caption: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
  small: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
} as const;

export type TypographyVariant = keyof typeof typography;

export const shadow = {
  card: {
    shadowColor: palette.navy,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

export const layout = {
  /** Largura máxima do conteúdo em tablets e web, para manter a leitura confortável. */
  maxContentWidth: 680,
  /** Área mínima de toque recomendada (Apple 44pt / Material 48dp). */
  minTouchTarget: 48,
} as const;

/** Paleta de fundos usada nos espaços reservados das fotos de receitas. */
export const coverTints = [
  palette.yellowSoft,
  palette.pinkSoft,
  palette.greenSoft,
  palette.skySoft,
  palette.orangeSoft,
] as const;
