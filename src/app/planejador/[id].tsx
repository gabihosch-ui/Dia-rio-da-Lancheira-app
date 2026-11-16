import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View, type ScrollViewInstance } from 'react-native';

import {
  StepChooseRecipes,
  StepDistribute,
  StepPantry,
  StepPrep,
  StepSides,
  StepSummary,
  type StepProps,
} from '@/components/planner/steps';
import { AppText, Badge, Button, Row, Screen } from '@/components/ui/primitives';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import type { PlannerWeek } from '@/domain/models';
import { useAsync } from '@/hooks/use-async';
import { notify, notYet } from '@/lib/notify';
import { canAdvance, PLANNER_STEPS, pruneWeek, TOTAL_STEPS } from '@/lib/planner';
import { demoRecipes } from '@/data/demo/recipes';
import { services } from '@/services';
import { useDemoStore } from '@/state/demo-store';
import { colors, radius, spacing } from '@/theme/tokens';

const STEP_COMPONENTS: Record<number, (p: StepProps) => React.ReactNode> = {
  1: StepChooseRecipes,
  2: StepPrep,
  3: StepDistribute,
  4: StepSides,
  5: StepPantry,
  6: StepSummary,
};

export default function PlannerWizardScreen() {
  const { id, add } = useLocalSearchParams<{ id: string; add?: string }>();
  const { getWeek, saveWeek, setWeekStatus, plannerRules } = useDemoStore();
  const stored = getWeek(id);

  const data = useAsync(async () => {
    // O Planejador ainda usa as receitas demonstrativas; a ligação com a biblioteca real é a próxima fase.
    const [recipes, sideItems] = await Promise.all([Promise.resolve(demoRecipes), services.catalog.listSideItems()]);
    return { recipes, sideItems };
  }, []);

  const [week, setWeek] = useState<PlannerWeek | undefined>(() =>
    stored && add && !stored.recipeIds.includes(add) ? { ...stored, recipeIds: [...stored.recipeIds, add] } : stored,
  );
  const [step, setStep] = useState<number>(() =>
    stored && stored.status !== 'rascunho' ? TOTAL_STEPS : (stored?.currentStep ?? 1),
  );
  const scrollRef = useRef<ScrollViewInstance>(null);

  // A semana pode ter sido criada no mesmo instante em que a tela abriu.
  if (!week && stored) {
    setWeek(add && !stored.recipeIds.includes(add) ? { ...stored, recipeIds: [...stored.recipeIds, add] } : stored);
  }

  if (!week) {
    return (
      <Screen hasHeader>
        <EmptyState
          icon="calendar-clear-outline"
          title="Planejamento não encontrado"
          action={{ label: 'Voltar', onPress: () => router.back() }}
        />
      </Screen>
    );
  }
  if (data.status === 'loading')
    return (
      <Screen hasHeader>
        <LoadingState />
      </Screen>
    );
  if (data.status === 'error')
    return (
      <Screen hasHeader>
        <ErrorState message={data.error.message} onRetry={data.reload} />
      </Screen>
    );

  const readOnly = week.status === 'arquivado';
  const check = canAdvance(step, week, plannerRules);
  const meta = PLANNER_STEPS[step - 1];
  const StepView = STEP_COMPONENTS[step];

  function update(next: PlannerWeek) {
    if (readOnly) return;
    setWeek(pruneWeek(next));
  }

  function goTo(target: number) {
    if (!week) return;
    const reached = Math.max(week.currentStep, target);
    const next = { ...week, currentStep: week.status === 'rascunho' ? reached : week.currentStep };
    if (!readOnly) saveWeek(next);
    setWeek(next);
    setStep(target);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function saveDraft() {
    if (!week) return;
    saveWeek({ ...week, currentStep: Math.max(week.currentStep, step) });
    notify('Rascunho salvo', 'Você pode continuar depois pela aba Planejador. (Somente neste aparelho.)');
    router.back();
  }

  function finish() {
    if (!week) return;
    saveWeek({ ...week, currentStep: TOTAL_STEPS });
    setWeekStatus(week.id, 'ativo');
    notify('Semana ativada!', 'Seu cardápio e a lista de compras estão prontos.');
    router.back();
  }

  const footer = readOnly ? (
    <Button
      label="Reativar semana"
      variant="secondary"
      fullWidth
      onPress={() => {
        setWeekStatus(week.id, 'ativo');
        router.back();
      }}
    />
  ) : (
    <View style={{ gap: spacing.sm }}>
      {!check.ok ? (
        <AppText variant="caption" color={colors.warning} align="center" accessibilityLiveRegion="polite">
          {check.message}
        </AppText>
      ) : null}
      <Row gap={spacing.sm}>
        {step > 1 ? (
          <View style={{ flex: 1 }}>
            <Button label="Voltar" variant="secondary" fullWidth onPress={() => goTo(step - 1)} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          {step < TOTAL_STEPS ? (
            <Button label="Próxima etapa" fullWidth disabled={!check.ok} onPress={() => goTo(step + 1)} />
          ) : week.status === 'ativo' ? (
            <Button
              label="Salvar alterações"
              fullWidth
              onPress={() => {
                saveWeek(week);
                router.back();
              }}
            />
          ) : (
            <Button label="Concluir semana" icon="checkmark" fullWidth onPress={finish} />
          )}
        </View>
      </Row>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: week.title,
          headerRight: () =>
            week.status === 'rascunho' ? (
              <Pressable
                onPress={saveDraft}
                accessibilityRole="button"
                hitSlop={12}
                style={{ paddingHorizontal: spacing.sm }}>
                <AppText variant="caption" color={colors.accent} style={{ fontWeight: '800' }}>
                  Salvar rascunho
                </AppText>
              </Pressable>
            ) : null,
        }}
      />
      <Screen hasHeader footer={footer} scrollRef={scrollRef}>
        <StepIndicator
          step={step}
          reached={week.status === 'rascunho' ? week.currentStep : TOTAL_STEPS}
          onSelect={goTo}
        />
        <View style={{ gap: spacing.xs }}>
          <Row gap={spacing.sm}>
            <AppText variant="caption" color={colors.accent} style={{ fontWeight: '800' }}>
              ETAPA {step} DE {TOTAL_STEPS}
            </AppText>
            {readOnly ? <Badge label="Arquivada (somente leitura)" tone="neutral" /> : null}
          </Row>
          <AppText variant="title">{meta.title}</AppText>
        </View>

        <View style={{ gap: spacing.md }} pointerEvents={readOnly ? 'none' : 'auto'}>
          <StepView
            week={week}
            onChange={update}
            recipes={data.data.recipes}
            sideItems={data.data.sideItems}
            rules={plannerRules}
          />
        </View>

        {step === TOTAL_STEPS ? (
          <Row gap={spacing.sm} wrap>
            <Button
              label="Gerar PDF"
              icon="document-outline"
              variant="secondary"
              small
              onPress={() => notYet('Gerar PDF', 'Fase 5')}
            />
            <Button
              label="Compartilhar"
              icon="share-social-outline"
              variant="secondary"
              small
              onPress={() => notYet('Compartilhar', 'Fase 5')}
            />
          </Row>
        ) : null}
      </Screen>
    </>
  );
}

function StepIndicator({ step, reached, onSelect }: { step: number; reached: number; onSelect: (s: number) => void }) {
  return (
    <Row gap={spacing.xs}>
      {PLANNER_STEPS.map((s) => {
        const enabled = s.step <= reached;
        const current = s.step === step;
        return (
          <Pressable
            key={s.step}
            disabled={!enabled}
            onPress={() => onSelect(s.step)}
            accessibilityRole="button"
            accessibilityLabel={`Etapa ${s.step}: ${s.title}`}
            accessibilityState={{ selected: current, disabled: !enabled }}
            style={{ flex: 1, gap: 4, alignItems: 'center' }}>
            <View
              style={{
                height: 6,
                alignSelf: 'stretch',
                borderRadius: radius.pill,
                backgroundColor: current ? colors.accent : enabled ? colors.primary : colors.border,
              }}
            />
            <AppText
              variant="small"
              color={current ? colors.accent : enabled ? colors.textTitle : colors.textSubtle}
              style={{ fontSize: 10 }}
              numberOfLines={1}>
              {s.short}
            </AppText>
          </Pressable>
        );
      })}
    </Row>
  );
}
