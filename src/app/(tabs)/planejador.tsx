import { router } from 'expo-router';
import { View } from 'react-native';

import { ClubGate } from '@/components/recipes/club-gate';
import { DemoNotice } from '@/components/ui/brand';
import { AppText, Badge, Button, Card, Icon, Row, Screen, Section } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/states';
import type { PlannerWeek } from '@/domain/models';
import { formatRelative } from '@/lib/format';
import { PLANNER_STEPS, TOTAL_STEPS } from '@/lib/planner';
import { useDemoStore } from '@/state/demo-store';
import { colors, radius, spacing } from '@/theme/tokens';

export default function PlannerHomeScreen() {
  const { weeks, createWeek, setWeekStatus, demoHasClubAccess } = useDemoStore();
  const active = weeks.filter((w) => w.status === 'ativo');
  const drafts = weeks.filter((w) => w.status === 'rascunho');
  const archived = weeks.filter((w) => w.status === 'arquivado');

  function newWeek() {
    const w = createWeek();
    router.push(`/planejador/${w.id}`);
  }

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="display">Planejador</AppText>
        <AppText color={colors.textMuted}>Organize as lancheiras da semana em 6 etapas.</AppText>
      </View>

      <Card tone="info" style={{ gap: spacing.md }}>
        {PLANNER_STEPS.map((s) => (
          <Row key={s.step} gap={spacing.md}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <AppText variant="caption" color={colors.textTitle} style={{ fontWeight: '800' }}>
                {s.step}
              </AppText>
            </View>
            <AppText style={{ flex: 1 }}>{s.title}</AppText>
          </Row>
        ))}
      </Card>

      {!demoHasClubAccess ? (
        <ClubGate
          title="Planejador do Clube"
          message="O Planejador semanal é um benefício do Clube. Explore os exemplos abaixo para conhecer o funcionamento."
        />
      ) : null}

      <Button label="Planejar nova semana" icon="add" fullWidth onPress={newWeek} />

      <WeekGroup
        title="Semana ativa"
        weeks={active}
        empty="Nenhuma semana ativa no momento."
        onArchive={(id) => setWeekStatus(id, 'arquivado')}
      />
      <WeekGroup title="Rascunhos" weeks={drafts} empty="Nenhum rascunho. Comece uma nova semana!" />
      <WeekGroup title="Anteriores" weeks={archived} empty="Os planejamentos arquivados aparecerão aqui." />

      <DemoNotice text="Protótipo: os planejamentos ficam apenas na memória deste aparelho e são apagados ao fechar o app. Na versão final, cada planejamento pertence exclusivamente à sua conta." />
    </Screen>
  );
}

function WeekGroup({
  title,
  weeks,
  empty,
  onArchive,
}: {
  title: string;
  weeks: PlannerWeek[];
  empty: string;
  onArchive?: (id: string) => void;
}) {
  return (
    <Section title={title}>
      {weeks.length === 0 ? <EmptyState icon="calendar-clear-outline" title={empty} /> : null}
      {weeks.map((w) => (
        <View key={w.id} style={{ gap: spacing.sm }}>
          <Card onPress={() => router.push(`/planejador/${w.id}`)} accessibilityLabel={`Abrir ${w.title}`}>
            <Row gap={spacing.md}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radius.md,
                  backgroundColor: w.status === 'ativo' ? colors.primary : colors.surfaceMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon name={w.status === 'arquivado' ? 'archive-outline' : 'calendar'} color={colors.textTitle} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="bodyStrong" color={colors.textTitle}>
                  {w.title}
                </AppText>
                <Row gap={spacing.sm} wrap>
                  {w.status === 'rascunho' ? (
                    <Badge label={`Etapa ${w.currentStep} de ${TOTAL_STEPS}`} tone="warning" />
                  ) : (
                    <Badge
                      label={`${w.recipeIds.length} receitas`}
                      tone={w.status === 'ativo' ? 'success' : 'neutral'}
                    />
                  )}
                  <AppText variant="small" color={colors.textSubtle}>
                    atualizado {formatRelative(w.updatedAt)}
                  </AppText>
                </Row>
              </View>
              <Icon name="chevron-forward" color={colors.textSubtle} />
            </Row>
          </Card>
          {onArchive ? (
            <Row>
              <Button
                label="Arquivar semana"
                icon="archive-outline"
                variant="secondary"
                small
                onPress={() => onArchive(w.id)}
              />
            </Row>
          ) : null}
        </View>
      ))}
    </Section>
  );
}
