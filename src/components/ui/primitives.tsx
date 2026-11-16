import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode, RefObject } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ScrollViewInstance,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radius, shadow, spacing, typography, type TypographyVariant } from '@/theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------- Texto ----------

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: TextStyle['textAlign'];
}

export function AppText({ variant = 'body', color, align, style, ...rest }: AppTextProps) {
  const isHeading = variant === 'display' || variant === 'title' || variant === 'subtitle';
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      style={[
        typography[variant],
        { color: color ?? (isHeading ? colors.textTitle : colors.text), textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}

export function Icon({ name, size = 22, color = colors.textTitle }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

// ---------- Layout ----------

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Já existe cabeçalho nativo acima (não somar a área segura do topo). */
  hasHeader?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  scrollRef?: RefObject<ScrollViewInstance | null>;
}

/** Contêiner padrão: fundo creme, área segura, largura máxima em telas grandes. */
export function Screen({ children, scroll = true, hasHeader = false, contentStyle, footer, scrollRef }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const inner = [styles.screenInner, { paddingTop: hasHeader ? spacing.lg : insets.top + spacing.lg }, contentStyle];
  return (
    <View style={styles.screen}>
      {scroll ? (
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={inner}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.scrollContent, { flex: 1 }]}>
          <View style={[inner, { flex: 1 }]}>{children}</View>
        </View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

export function Row({
  children,
  gap = spacing.sm,
  style,
  wrap,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  wrap?: boolean;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>
      {children}
    </View>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: ReactNode;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <AppText variant="subtitle" style={{ flex: 1 }}>
          {title}
        </AppText>
        {action ? (
          <Pressable onPress={action.onPress} accessibilityRole="link" hitSlop={12}>
            <AppText variant="caption" color={colors.accent} style={{ fontWeight: '700' }}>
              {action.label}
            </AppText>
          </Pressable>
        ) : null}
      </Row>
      {children}
    </View>
  );
}

// ---------- Cartões ----------

export function Card({
  children,
  onPress,
  style,
  accessibilityLabel,
  tone = 'surface',
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  tone?: 'surface' | 'primary' | 'accent' | 'info' | 'success' | 'warning' | 'danger';
}) {
  const bg = {
    surface: colors.surface,
    primary: colors.primarySoft,
    accent: colors.accentSoft,
    info: colors.infoSoft,
    success: colors.successSoft,
    warning: colors.warningSoft,
    danger: colors.dangerSoft,
  }[tone];
  const base = [styles.card, { backgroundColor: bg }, tone === 'surface' && shadow.card, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

// ---------- Botões ----------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  small?: boolean;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  fullWidth,
  small,
  accessibilityHint,
}: ButtonProps) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        fullWidth && { alignSelf: 'stretch' },
        (disabled || loading) && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Row gap={spacing.sm} style={{ justifyContent: 'center' }}>
          {icon ? <Icon name={icon} size={small ? 18 : 20} color={v.fg} /> : null}
          <AppText variant={small ? 'caption' : 'bodyStrong'} color={v.fg} style={{ fontWeight: '700' }}>
            {label}
          </AppText>
        </Row>
      )}
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.textOnPrimary, border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.textTitle, border: colors.borderStrong },
  ghost: { bg: 'transparent', fg: colors.accent, border: 'transparent' },
  danger: { bg: colors.surface, fg: colors.danger, border: colors.danger },
};

export function IconButton({
  icon,
  label,
  onPress,
  color = colors.textTitle,
  badge,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  badge?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} color={color} size={24} />
      {badge ? (
        <View style={styles.badgeDot}>
          <AppText variant="small" color={colors.textOnAccent} style={{ fontSize: 10, lineHeight: 12 }}>
            {badge}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------- Chips e selos ----------

export function Chip({
  label,
  selected,
  onPress,
  emoji,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  emoji?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        selected ? { backgroundColor: colors.accent, borderColor: colors.accent } : null,
        pressed && { opacity: 0.8 },
      ]}>
      <AppText
        variant="caption"
        color={selected ? colors.textOnAccent : colors.textTitle}
        style={{ fontWeight: '700' }}>
        {emoji ? `${emoji} ` : ''}
        {label}
      </AppText>
    </Pressable>
  );
}

export function Badge({
  label,
  tone = 'primary',
  icon,
}: {
  label: string;
  tone?: 'primary' | 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  icon?: IconName;
}) {
  const map = {
    primary: [colors.primarySoft, colors.textTitle],
    accent: [colors.accentSoft, colors.accent],
    info: [colors.infoSoft, colors.textTitle],
    success: [colors.successSoft, '#2E6B47'],
    warning: [colors.warningSoft, '#8A4A12'],
    danger: [colors.dangerSoft, colors.danger],
    neutral: [colors.surfaceMuted, colors.textMuted],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon} size={12} color={fg} /> : null}
      <AppText variant="small" color={fg}>
        {label}
      </AppText>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong }} />;
}

export function Avatar({ initials, size = 40 }: { initials: string; size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <AppText variant="caption" color={colors.accent} style={{ fontWeight: '800', fontSize: size * 0.36 }}>
        {initials}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  screenInner: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  footerInner: { width: '100%', maxWidth: layout.maxContentWidth },
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  button: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: spacing.lg },
  iconButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
});
