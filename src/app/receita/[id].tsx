import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AddToPlannerSheet } from '@/components/recipes/add-to-planner-sheet';
import { ClubGate } from '@/components/recipes/club-gate';
import { RecipeCover } from '@/components/recipes/recipe-card';
import { DemoNotice } from '@/components/ui/brand';
import {
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  Icon,
  IconButton,
  Row,
  Screen,
  Section,
} from '@/components/ui/primitives';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { demoUnits } from '@/data/demo/recipes';
import type { Recipe } from '@/domain/models';
import { useAsync } from '@/hooks/use-async';
import { formatRelative } from '@/lib/format';
import { notYet } from '@/lib/notify';
import { formatQuantity } from '@/lib/planner';
import { services } from '@/services';
import { useDemoStore } from '@/state/demo-store';
import { colors, radius, spacing } from '@/theme/tokens';

const unitLabel = (id: string | null) => demoUnits.find((u) => u.id === id)?.abbreviation ?? '';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { demoHasClubAccess, favorites, toggleFavorite } = useDemoStore();
  const [sheetOpen, setSheetOpen] = useState(false);

  const recipe = useAsync(() => services.recipes.getById(id), [id]);
  const questions = useAsync(() => services.recipes.listQuestions(id), [id]);

  if (recipe.status === 'loading')
    return (
      <Screen hasHeader>
        <LoadingState />
      </Screen>
    );
  if (recipe.status === 'error') {
    return (
      <Screen hasHeader>
        <ErrorState message={recipe.error.message} onRetry={recipe.reload} />
      </Screen>
    );
  }
  const r = recipe.data;
  if (!r) {
    return (
      <Screen hasHeader>
        <EmptyState
          icon="help-circle-outline"
          title="Receita não encontrada"
          action={{ label: 'Ver receitas', onPress: () => router.replace('/receitas') }}
        />
      </Screen>
    );
  }

  const unlocked = !r.isExclusive || demoHasClubAccess;
  const isFav = favorites.has(r.id);

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <IconButton
              icon={isFav ? 'heart' : 'heart-outline'}
              color={isFav ? colors.accent : colors.textTitle}
              label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              onPress={() => toggleFavorite(r.id)}
            />
          ),
        }}
      />
      <Screen hasHeader>
        <RecipeCover recipe={r} height={220} />

        <View style={{ gap: spacing.sm }}>
          <Row gap={spacing.sm} wrap>
            {r.isOfficial ? <Badge label="Receita oficial" tone="accent" icon="checkmark-circle" /> : null}
            {r.isExclusive ? (
              <Badge label="Clube" tone="primary" icon="star" />
            ) : (
              <Badge label="Amostra grátis" tone="success" />
            )}
          </Row>
          <AppText variant="display">{r.title}</AppText>
          <AppText color={colors.textMuted}>{r.description}</AppText>
        </View>

        <Row gap={spacing.sm} style={{ alignItems: 'stretch' }}>
          <MetaBox icon="time-outline" label="Preparo" value={`${r.prepMinutes} min`} />
          <MetaBox icon="restaurant-outline" label="Rendimento" value={r.yieldLabel} />
          <MetaBox
            icon="snow-outline"
            label="Congela"
            value={r.freezing.freezable ? `até ${r.freezing.maxDays} dias` : 'Não'}
          />
        </Row>

        <Row gap={spacing.sm} wrap>
          <Button
            label={isFav ? 'Favorita' : 'Favoritar'}
            icon={isFav ? 'heart' : 'heart-outline'}
            variant="secondary"
            small
            onPress={() => toggleFavorite(r.id)}
          />
          <Button label="Adicionar ao Planejador" icon="calendar" small onPress={() => setSheetOpen(true)} />
        </Row>

        {unlocked ? <UnlockedContent recipe={r} /> : <ClubGate />}

        <Section title="Perguntas e respostas">
          {questions.status === 'loading' ? <LoadingState /> : null}
          {questions.status === 'error' ? <ErrorState onRetry={questions.reload} /> : null}
          {questions.status === 'success' && questions.data.length === 0 ? (
            <AppText color={colors.textMuted}>Ainda não há perguntas sobre esta receita.</AppText>
          ) : null}
          {questions.status === 'success'
            ? questions.data.map((q) => (
                <Card key={q.id} style={{ gap: spacing.sm }}>
                  <AppText variant="bodyStrong" color={colors.textTitle}>
                    {q.text}
                  </AppText>
                  <AppText variant="small" color={colors.textSubtle}>
                    {q.authorPublicName} · {formatRelative(q.createdAt)}
                  </AppText>
                  {q.answer ? (
                    <View
                      style={{
                        backgroundColor: colors.accentSoft,
                        borderRadius: radius.md,
                        padding: spacing.md,
                        gap: 4,
                      }}>
                      <Row gap={6}>
                        <AppText variant="caption" color={colors.accent} style={{ fontWeight: '800' }}>
                          {q.answer.authorPublicName}
                        </AppText>
                        {q.answer.isOfficial ? <Icon name="checkmark-circle" size={14} color={colors.accent} /> : null}
                      </Row>
                      <AppText variant="caption">{q.answer.text}</AppText>
                    </View>
                  ) : (
                    <Badge label="Aguardando resposta" tone="neutral" />
                  )}
                </Card>
              ))
            : null}
          <Button
            label="Fazer uma pergunta"
            icon="chatbubble-ellipses-outline"
            variant="secondary"
            onPress={() => notYet('Fazer uma pergunta', 'Fase 6 (Comunidade)')}
          />
        </Section>
      </Screen>

      <AddToPlannerSheet visible={sheetOpen} recipeId={r.id} onClose={() => setSheetOpen(false)} />
    </>
  );
}

function MetaBox({
  icon,
  label,
  value,
}: {
  icon: 'time-outline' | 'restaurant-outline' | 'snow-outline';
  label: string;
  value: string;
}) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', padding: spacing.md, gap: 2 }}>
      <Icon name={icon} size={20} color={colors.accent} />
      <AppText variant="small" color={colors.textSubtle}>
        {label}
      </AppText>
      <AppText variant="caption" color={colors.textTitle} align="center" style={{ fontWeight: '700' }}>
        {value}
      </AppText>
    </Card>
  );
}

function UnlockedContent({ recipe: r }: { recipe: Recipe }) {
  return (
    <>
      <Section title="Vídeo">
        {r.video ? (
          <View
            accessibilityRole="image"
            accessibilityLabel="Espaço reservado do vídeo da receita"
            style={{
              height: 200,
              borderRadius: radius.lg,
              backgroundColor: colors.textTitle,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
            }}>
            <Icon name="play-circle" size={56} color={colors.primary} />
            <AppText variant="caption" color={colors.surface} align="center">
              Vídeo de {Math.round(r.video.durationSeconds / 60)} min{'\n'}O player protegido entra na Fase 4
            </AppText>
          </View>
        ) : (
          <AppText color={colors.textMuted}>Esta receita ainda não tem vídeo.</AppText>
        )}
      </Section>

      <Section title="Ingredientes">
        <Card style={{ gap: spacing.md }}>
          {r.ingredients.map((i, idx) => (
            <View key={i.ingredientId} style={{ gap: spacing.md }}>
              {idx > 0 ? <Divider /> : null}
              <Row gap={spacing.md}>
                <AppText variant="bodyStrong" color={colors.accent} style={{ minWidth: 96 }}>
                  {i.quantity != null ? `${formatQuantity(i.quantity)} ${unitLabel(i.unitId)}` : 'a gosto'}
                </AppText>
                <AppText style={{ flex: 1 }}>
                  {i.name}
                  {i.note ? <AppText color={colors.textSubtle}> ({i.note})</AppText> : null}
                </AppText>
              </Row>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Modo de preparo">
        {r.steps.map((s) => (
          <Row key={s.order} gap={spacing.md} style={{ alignItems: 'flex-start' }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <AppText variant="bodyStrong" color={colors.textTitle}>
                {s.order}
              </AppText>
            </View>
            <AppText style={{ flex: 1, paddingTop: 4 }}>{s.text}</AppText>
          </Row>
        ))}
      </Section>

      {r.freezing.freezable ? (
        <Card tone="info">
          <Row gap={spacing.sm}>
            <Icon name="snow" size={20} color={colors.textTitle} />
            <AppText variant="bodyStrong" color={colors.textTitle}>
              Congelamento
            </AppText>
          </Row>
          <AppText>{r.freezing.howTo}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Validade no congelador: até {r.freezing.maxDays} dias.
          </AppText>
        </Card>
      ) : null}

      {r.tips.length > 0 ? (
        <Card tone="primary">
          <Row gap={spacing.sm}>
            <Icon name="bulb" size={20} color={colors.textTitle} />
            <AppText variant="bodyStrong" color={colors.textTitle}>
              Dicas
            </AppText>
          </Row>
          {r.tips.map((t) => (
            <AppText key={t}>• {t}</AppText>
          ))}
        </Card>
      ) : null}

      {r.isExclusive ? (
        <DemoNotice text="Você está vendo este conteúdo porque o modo de demonstração está como assinante." />
      ) : null}
    </>
  );
}
