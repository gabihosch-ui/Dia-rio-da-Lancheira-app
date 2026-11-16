import { ActivityIndicator, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

import { AppText, Button, Icon, type IconName } from './primitives';

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <View
      style={{ paddingVertical: spacing.xxxl, alignItems: 'center', gap: spacing.md }}
      accessibilityRole="progressbar"
      accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.accent} />
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={{ paddingVertical: spacing.xxl, alignItems: 'center', gap: spacing.md }} accessibilityRole="alert">
      <Icon name="cloud-offline-outline" size={44} color={colors.danger} />
      <AppText variant="subtitle" align="center">
        Algo deu errado
      </AppText>
      <AppText color={colors.textMuted} align="center">
        {message ?? 'Não foi possível carregar este conteúdo.'}
      </AppText>
      {onRetry ? <Button label="Tentar novamente" icon="refresh" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({
  icon = 'leaf-outline',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={{ paddingVertical: spacing.xxl, alignItems: 'center', gap: spacing.md }}>
      <Icon name={icon} size={44} color={colors.textSubtle} />
      <AppText variant="subtitle" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText color={colors.textMuted} align="center">
          {message}
        </AppText>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} small /> : null}
    </View>
  );
}
