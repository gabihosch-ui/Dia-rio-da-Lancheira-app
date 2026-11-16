import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, Button, Card, Icon } from '@/components/ui/primitives';
import { colors, spacing } from '@/theme/tokens';

/**
 * Bloco exibido no lugar do conteúdo exclusivo para quem não assina.
 * Na versão real, o próprio servidor deixará de enviar o conteúdo protegido:
 * este bloco é apenas a apresentação, não a proteção.
 */
export function ClubGate({ title = 'Conteúdo exclusivo do Clube', message }: { title?: string; message?: string }) {
  return (
    <Card tone="primary" style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name="lock-closed" size={26} color={colors.textTitle} />
      </View>
      <AppText variant="subtitle" align="center">
        {title}
      </AppText>
      <AppText align="center" color={colors.textMuted}>
        {message ?? 'Assine o Clube Diário da Lancheira para ver o vídeo, os ingredientes e o modo de preparo.'}
      </AppText>
      <Button label="Conhecer o Clube" icon="star" onPress={() => router.push('/assinatura')} />
    </Card>
  );
}
