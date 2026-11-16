import { Pressable, View } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

import { AppText, Icon, Row } from './primitives';

/**
 * ESPAÇO RESERVADO para a logo oficial do Diário da Lancheira.
 * Não criar nem desenhar outra logo. Quando o arquivo oficial for enviado,
 * salvar em assets/brand/ e trocar este componente por um <Image />.
 */
export function LogoPlaceholder({ compact }: { compact?: boolean }) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Diário da Lancheira (espaço reservado para a logo oficial)"
      style={{
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.accent,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: compact ? spacing.xs : spacing.sm,
        alignSelf: 'flex-start',
      }}>
      <AppText variant={compact ? 'caption' : 'bodyStrong'} color={colors.textTitle} style={{ fontWeight: '800' }}>
        Diário da Lancheira
      </AppText>
      {!compact ? (
        <AppText variant="small" color={colors.textSubtle}>
          logo oficial aqui
        </AppText>
      ) : null}
    </View>
  );
}

/** Aviso fixo de que o conteúdo é demonstrativo (Fase 1). */
export function DemoNotice({ text, onPress }: { text: string; onPress?: () => void }) {
  const content = (
    <Row gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
      <Icon name="flask-outline" size={18} color={colors.textMuted} />
      <AppText variant="caption" color={colors.textMuted} style={{ flex: 1 }}>
        {text}
      </AppText>
    </Row>
  );
  const style = {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  };
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={style}>
      {content}
    </Pressable>
  );
}
