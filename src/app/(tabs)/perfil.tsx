import { router } from 'expo-router';
import { Pressable, Switch, View } from 'react-native';

import {
  AppText,
  Avatar,
  Badge,
  Card,
  Divider,
  Icon,
  Row,
  Screen,
  Section,
  type IconName,
} from '@/components/ui/primitives';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useMe } from '@/hooks/use-me';
import { formatDate } from '@/lib/format';
import { confirmAction, notify, notYet } from '@/lib/notify';
import { SUBSCRIPTION_LABEL } from '@/lib/subscription';
import { useAuth } from '@/state/auth';
import { useDemoStore } from '@/state/demo-store';
import { colors, layout, spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const { subscription, favorites, weeks, localPosts, simulateErrors, setSimulateErrors } = useDemoStore();
  const { account, accountError, refreshAccount, signOut, isConfigured } = useAuth();
  const me = useMe();
  const sub = SUBSCRIPTION_LABEL[subscription.state];

  async function handleSignOut() {
    if (await confirmAction('Sair da conta', 'Você precisará entrar de novo com e-mail e senha.', 'Sair')) {
      await signOut();
    }
  }

  if (!me) {
    return (
      <Screen>
        <AppText variant="display">Perfil</AppText>
        {accountError ? <ErrorState message={accountError} onRetry={refreshAccount} /> : <LoadingState />}
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="display">Perfil</AppText>

      <Card style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
        <Avatar initials={me.initials} size={80} />
        <AppText variant="title">{me.fullName}</AppText>
        <AppText color={colors.textMuted}>Nome público: {me.publicName}</AppText>
        <Row gap={6}>
          <Icon name="lock-closed-outline" size={14} color={colors.textSubtle} />
          <AppText variant="caption" color={colors.textSubtle}>
            {me.email} · visível só para você
          </AppText>
        </Row>
        <AppText variant="small" color={colors.textSubtle}>
          Membro desde {formatDate(me.createdAt)}
        </AppText>
        {account?.roles.length ? <Badge label={`Equipe: ${account.roles.join(', ')}`} tone="info" /> : null}
        {me.isDemo ? <Badge label="Modo demonstração (sem login)" tone="neutral" /> : null}
      </Card>

      <Card onPress={() => router.push('/assinatura')} accessibilityLabel="Meu plano e assinatura">
        <Row gap={spacing.md}>
          <Icon name="star" size={26} color={colors.accent} />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="bodyStrong" color={colors.textTitle}>
              Meu plano e assinatura
            </AppText>
            <Badge label={sub.label} tone={sub.tone} />
          </View>
          <Icon name="chevron-forward" color={colors.textSubtle} />
        </Row>
      </Card>

      <Row gap={spacing.sm} style={{ alignItems: 'stretch' }}>
        <Stat label="Favoritas" value={favorites.size} onPress={() => router.push('/receitas')} />
        <Stat label="Planejamentos" value={weeks.length} onPress={() => router.push('/planejador')} />
        <Stat label="Publicações" value={localPosts.length + 1} onPress={() => router.push('/comunidade')} />
      </Row>

      <Section title="Conta">
        <Card style={{ padding: 0, gap: 0 }}>
          <MenuItem
            icon="create-outline"
            label="Editar perfil"
            onPress={() =>
              isConfigured
                ? router.push('/perfil/editar')
                : notify('Modo demonstração', 'Configure o Supabase no arquivo .env para usar login.')
            }
          />
          <Divider />
          <MenuItem
            icon="notifications-outline"
            label="Notificações"
            onPress={() => notYet('Preferências de notificação', 'Fase 6 (comunidade e notificações)')}
          />
          <Divider />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Privacidade"
            onPress={() => notYet('Configurações de privacidade', 'Fase 6 (comunidade)')}
          />
          <Divider />
          <MenuItem
            icon="hand-left-outline"
            label="Denúncias e bloqueios"
            onPress={() => notYet('Denúncias e bloqueios', 'Fase 6')}
          />
          <Divider />
          <MenuItem
            icon="trash-outline"
            label="Excluir minha conta"
            danger
            onPress={() =>
              account
                ? router.push('/perfil/excluir-conta')
                : notify('Modo demonstração', 'Configure o Supabase no arquivo .env para usar login.')
            }
          />
          <Divider />
          <MenuItem
            icon="log-out-outline"
            label="Sair"
            onPress={() =>
              isConfigured
                ? handleSignOut()
                : notify('Modo demonstração', 'Configure o Supabase no arquivo .env para usar login.')
            }
          />
        </Card>
      </Section>

      <Section title="Ferramentas de demonstração">
        <Card tone="warning" style={{ gap: spacing.md }}>
          <AppText variant="caption" color={colors.textMuted}>
            Só existem neste protótipo, para avaliar as telas. Não fazem parte do app final.
          </AppText>
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText style={{ flex: 1 }}>Simular erro ao carregar dados</AppText>
            <Switch
              value={simulateErrors}
              onValueChange={setSimulateErrors}
              accessibilityLabel="Simular erro ao carregar dados"
              trackColor={{ true: colors.accent, false: colors.borderStrong }}
            />
          </Row>
          <AppText variant="small" color={colors.textMuted}>
            Para simular assinante ou não-assinante, use os botões na tela “Meu plano e assinatura”.
          </AppText>
        </Card>
      </Section>

      <AppText variant="small" color={colors.textSubtle} align="center">
        Diário da Lancheira · protótipo Fase 1 · versão 1.0.0
      </AppText>
    </Screen>
  );
}

function Stat({ label, value, onPress }: { label: string; value: number; onPress: () => void }) {
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${label}: ${value}`}
      style={{ flex: 1, alignItems: 'center', padding: spacing.md }}>
      <AppText variant="title" color={colors.accent}>
        {value}
      </AppText>
      <AppText variant="small" color={colors.textMuted}>
        {label}
      </AppText>
    </Card>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const color = danger ? colors.danger : colors.textTitle;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        minHeight: layout.minTouchTarget + 8,
        paddingHorizontal: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        opacity: pressed ? 0.6 : 1,
      })}>
      <Icon name={icon} color={color} />
      <AppText style={{ flex: 1 }} color={color}>
        {label}
      </AppText>
      <Icon name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable>
  );
}
