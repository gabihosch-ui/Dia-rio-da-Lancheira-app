import { Platform, View } from 'react-native';

import { DemoNotice } from '@/components/ui/brand';
import { AppText, Badge, Button, Card, Chip, Icon, Row, Screen, Section } from '@/components/ui/primitives';
import { ErrorState, LoadingState } from '@/components/ui/states';
import type { SubscriptionState } from '@/domain/models';
import { useAsync } from '@/hooks/use-async';
import { formatDate } from '@/lib/format';
import { notify } from '@/lib/notify';
import { SUBSCRIPTION_LABEL } from '@/lib/subscription';
import { services } from '@/services';
import { useDemoStore } from '@/state/demo-store';
import { colors, spacing } from '@/theme/tokens';

const DEMO_STATES: { id: SubscriptionState; label: string }[] = [
  { id: 'nenhuma', label: 'Sem assinatura' },
  { id: 'ativa', label: 'Ativa' },
  { id: 'em_recuperacao', label: 'Falha no pagamento' },
  { id: 'cancelada_ate_fim', label: 'Cancelada' },
  { id: 'expirada', label: 'Expirada' },
];

const storeName = (p: 'apple' | 'google' | null) =>
  p === 'apple' ? 'App Store' : p === 'google' ? 'Google Play' : '—';

export default function SubscriptionScreen() {
  const { subscription, setDemoSubscription } = useDemoStore();
  const plan = useAsync(() => services.catalog.getPlan(), []);
  const s = subscription.state;
  const hasHistory = s !== 'nenhuma';
  const deviceStore = Platform.OS === 'ios' ? 'App Store' : 'Google Play';

  function subscribe() {
    notify(
      'Pagamento não disponível no protótipo',
      `A contratação será feita pela compra interna da ${deviceStore} na Fase 3, com validação no servidor. Nada foi cobrado.`,
    );
  }

  return (
    <Screen hasHeader>
      {plan.status === 'loading' ? <LoadingState /> : null}
      {plan.status === 'error' ? <ErrorState message={plan.error.message} onRetry={plan.reload} /> : null}

      {plan.status === 'success' ? (
        <>
          <Card tone="primary" style={{ gap: spacing.md, paddingVertical: spacing.xl }}>
            <Row gap={spacing.sm}>
              <Icon name="star" size={24} color={colors.accent} />
              <AppText variant="subtitle">{plan.data.name}</AppText>
            </Row>
            <Row gap={spacing.xs} style={{ alignItems: 'flex-end' }}>
              <AppText variant="display" style={{ fontSize: 40, lineHeight: 46 }}>
                {plan.data.priceLabel}
              </AppText>
              <AppText color={colors.textMuted} style={{ paddingBottom: 6 }}>
                {plan.data.periodLabel}
              </AppText>
            </Row>
            <View style={{ gap: spacing.sm }}>
              {plan.data.benefits.map((b) => (
                <Row key={b} gap={spacing.sm}>
                  <Icon name="checkmark-circle" size={20} color={colors.success} />
                  <AppText style={{ flex: 1 }}>{b}</AppText>
                </Row>
              ))}
            </View>
          </Card>

          {hasHistory ? (
            <Section title="Sua assinatura">
              <Card style={{ gap: spacing.md }}>
                <Badge label={SUBSCRIPTION_LABEL[s].label} tone={SUBSCRIPTION_LABEL[s].tone} />
                <InfoRow label="Plataforma" value={storeName(subscription.platform)} />
                {subscription.currentPeriodEnd ? (
                  <InfoRow
                    label={s === 'ativa' ? 'Próxima renovação' : s === 'expirada' ? 'Expirou em' : 'Acesso até'}
                    value={formatDate(subscription.currentPeriodEnd)}
                  />
                ) : null}
              </Card>

              {s === 'em_recuperacao' ? (
                <Card tone="warning">
                  <Row gap={spacing.sm}>
                    <Icon name="alert-circle" color={colors.warning} />
                    <AppText variant="bodyStrong" color={colors.textTitle}>
                      Não conseguimos renovar sua assinatura
                    </AppText>
                  </Row>
                  <AppText>
                    Atualize a forma de pagamento na {storeName(subscription.platform)}. Seu acesso continua liberado
                    durante o período de tolerância da loja.
                  </AppText>
                </Card>
              ) : null}
              {s === 'expirada' ? (
                <Card tone="danger">
                  <AppText>Sua assinatura terminou. Assine novamente para voltar a ver as receitas exclusivas.</AppText>
                </Card>
              ) : null}

              <Button
                label={`Gerenciar na ${storeName(subscription.platform)}`}
                icon="open-outline"
                variant="secondary"
                onPress={() =>
                  notify('Gerenciar assinatura', 'Na Fase 3 este botão abrirá a página de assinaturas da loja.')
                }
              />
              {s === 'expirada' ? <Button label="Assinar novamente" icon="star" onPress={subscribe} /> : null}
            </Section>
          ) : (
            <View style={{ gap: spacing.md }}>
              <Button label={`Assinar por ${plan.data.priceLabel}/mês`} icon="star" fullWidth onPress={subscribe} />
              <AppText variant="caption" color={colors.textMuted} align="center">
                Renovação automática mensal. Cancele quando quiser nas configurações da {deviceStore}. Preços e
                condições finais serão confirmados nas lojas.
              </AppText>
            </View>
          )}

          <Button
            label="Restaurar compras"
            icon="refresh"
            variant="ghost"
            onPress={() =>
              notify('Restaurar compras', 'Disponível na Fase 3: recupera a assinatura ao trocar de celular.')
            }
          />

          <Section title="Simular estado (somente protótipo)">
            <Row gap={spacing.sm} wrap>
              {DEMO_STATES.map((d) => (
                <Chip key={d.id} label={d.label} selected={s === d.id} onPress={() => setDemoSubscription(d.id)} />
              ))}
            </Row>
            <DemoNotice text="Estes botões apenas trocam a aparência das telas. No app real o status virá do servidor, validado com a Apple e o Google — nunca de uma informação guardada no aparelho." />
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <AppText color={colors.textMuted}>{label}</AppText>
      <AppText variant="bodyStrong" color={colors.textTitle}>
        {value}
      </AppText>
    </Row>
  );
}
