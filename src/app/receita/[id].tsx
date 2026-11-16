import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AddToPlannerSheet } from '@/components/recipes/add-to-planner-sheet';
import { ClubGate } from '@/components/recipes/club-gate';
import { RecipeCover } from '@/components/recipes/recipe-card';
import { RecipeVideo } from '@/components/recipes/recipe-video';
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
import type { RecipeContent, RecipeDetail, Unit } from '@/domain/models';
import { useAsync } from '@/hooks/use-async';
import { formatRelative } from '@/lib/format';
import { notify } from '@/lib/notify';
import { formatIngredient, formatMinutes } from '@/lib/recipes';
import { services, USING_REAL_RECIPES } from '@/services';
import { useLibrary } from '@/state/library';
import { colors, layout, radius, spacing } from '@/theme/tokens';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isFavorite, toggleFavorite, access } = useLibrary();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Recarrega quando o acesso muda (ex.: acesso de teste concedido pela equipe).
  const recipe = useAsync(() => services.recipes.getDetail(id), [id, access.hasAccess]);
  const units = useAsync(() => services.recipes.listUnits(), []);

  if (recipe.status === 'loading')
    return (
      <Screen hasHeader>
        <LoadingState />
      </Screen>
    );
  if (recipe.status === 'error')
    return (
      <Screen hasHeader>
        <ErrorState message={recipe.error.message} onRetry={recipe.reload} />
      </Screen>
    );
  const r = recipe.data;
  if (!r)
    return (
      <Screen hasHeader>
        <EmptyState
          icon="help-circle-outline"
          title="Receita indisponível"
          message="Ela pode ter sido retirada do catálogo."
          action={{ label: 'Ver receitas', onPress: () => router.replace('/receitas') }}
        />
      </Screen>
    );

  const fav = isFavorite(r.id);

  function addToPlanner() {
    if (USING_REAL_RECIPES) {
      notify(
        'Planejador',
        'A inclusão de receitas no Planejador chega na próxima fase, junto com o Planejador conectado à sua conta.',
      );
    } else {
      setSheetOpen(true);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <IconButton
              icon={fav ? 'heart' : 'heart-outline'}
              color={fav ? colors.accent : colors.textTitle}
              label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              onPress={() => toggleFavorite(r.id)}
            />
          ),
        }}
      />
      <Screen hasHeader>
        <RecipeCover recipe={r} height={240} />

        <View style={{ gap: spacing.sm }}>
          <Row gap={spacing.sm} wrap>
            <Badge label="Receita oficial" tone="accent" icon="checkmark-circle" />
            {r.isExclusive ? (
              <Badge label="Clube" tone="primary" icon="star" />
            ) : (
              <Badge label="Amostra grátis" tone="success" />
            )}
            {r.categories.map((c) => (
              <Badge key={c.id} label={`${c.emoji} ${c.name}`.trim()} tone="neutral" />
            ))}
          </Row>
          <AppText variant="display">{r.title}</AppText>
          {r.description ? <AppText color={colors.textMuted}>{r.description}</AppText> : null}
        </View>

        <Row gap={spacing.sm} style={{ alignItems: 'stretch' }}>
          <MetaBox icon="time-outline" label="Tempo" value={formatMinutes(r.prepMinutes)} />
          <MetaBox icon="restaurant-outline" label="Rendimento" value={r.yieldLabel || '—'} />
          <MetaBox icon="snow-outline" label="Congela" value={r.freezable ? 'Sim' : 'Não'} />
        </Row>

        <Row gap={spacing.sm} wrap>
          <Button
            label={fav ? 'Favorita' : 'Favoritar'}
            icon={fav ? 'heart' : 'heart-outline'}
            variant="secondary"
            small
            onPress={() => toggleFavorite(r.id)}
          />
          <Button label="Adicionar ao Planejador" icon="calendar" small onPress={addToPlanner} />
        </Row>

        {r.content ? (
          <Content recipe={r} content={r.content} units={units.status === 'success' ? units.data : []} />
        ) : (
          <ClubGate />
        )}

        {!USING_REAL_RECIPES ? <DemoQuestions recipeId={r.id} /> : null}
      </Screen>

      {!USING_REAL_RECIPES ? (
        <AddToPlannerSheet visible={sheetOpen} recipeId={r.id} onClose={() => setSheetOpen(false)} />
      ) : null}
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

function Content({ recipe: r, content, units }: { recipe: RecipeDetail; content: RecipeContent; units: Unit[] }) {
  // Marcação local, só para acompanhar o preparo (não é salva).
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setChecked((prev) => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return s;
    });

  return (
    <>
      {content.video ? (
        <Section title="Vídeo">
          <RecipeVideo recipeId={r.id} video={content.video} />
        </Section>
      ) : null}

      <Section title="Ingredientes">
        <Card style={{ gap: 0, paddingVertical: spacing.sm }}>
          {content.ingredients.map((i, idx) => {
            const done = checked.has(i.ingredientId);
            const line = formatIngredient(i, units);
            return (
              <View key={i.ingredientId}>
                {idx > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => toggle(i.ingredientId)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  aria-checked={done}
                  accessibilityLabel={line}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    minHeight: layout.minTouchTarget,
                  }}>
                  <Icon
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    color={done ? colors.success : colors.borderStrong}
                  />
                  <AppText
                    style={{ flex: 1, textDecorationLine: done ? 'line-through' : 'none' }}
                    color={done ? colors.textSubtle : colors.text}>
                    {line}
                  </AppText>
                </Pressable>
              </View>
            );
          })}
        </Card>
        <AppText variant="small" color={colors.textSubtle}>
          Toque para marcar o que já separou.
        </AppText>
      </Section>

      <Section title="Modo de preparo">
        {content.steps.map((s) => (
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
            <AppText style={{ flex: 1, paddingTop: 4, lineHeight: 25 }}>{s.text}</AppText>
          </Row>
        ))}
      </Section>

      {content.freezing ? (
        <Card tone="info" style={{ gap: spacing.sm }}>
          <Row gap={spacing.sm}>
            <Icon name="snow" size={20} color={colors.textTitle} />
            <AppText variant="bodyStrong" color={colors.textTitle}>
              Congelamento
            </AppText>
          </Row>
          <AppText>Pode congelar por até {content.freezing.days} dias.</AppText>
          {content.freezing.howToPack ? <InfoLine label="Como embalar" text={content.freezing.howToPack} /> : null}
          {content.freezing.howToThaw ? <InfoLine label="Como descongelar" text={content.freezing.howToThaw} /> : null}
          <AppText variant="small" color={colors.textSubtle}>
            Orientações da equipe Diário da Lancheira.
          </AppText>
        </Card>
      ) : null}

      {r.tips?.length ? (
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
    </>
  );
}

function InfoLine({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="caption" color={colors.textTitle} style={{ fontWeight: '700' }}>
        {label}
      </AppText>
      <AppText>{text}</AppText>
    </View>
  );
}

/** Perguntas e respostas demonstrativas (a versão real chega com a Comunidade). */
function DemoQuestions({ recipeId }: { recipeId: string }) {
  const questions = useAsync(() => services.recipes.listQuestions(recipeId), [recipeId]);
  if (questions.status !== 'success' || questions.data.length === 0) return null;
  return (
    <Section title="Perguntas e respostas">
      {questions.data.map((q) => (
        <Card key={q.id} style={{ gap: spacing.sm }}>
          <AppText variant="bodyStrong" color={colors.textTitle}>
            {q.text}
          </AppText>
          <AppText variant="small" color={colors.textSubtle}>
            {q.authorPublicName} · {formatRelative(q.createdAt)}
          </AppText>
          {q.answer ? (
            <View style={{ backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: spacing.md, gap: 4 }}>
              <AppText variant="caption" color={colors.accent} style={{ fontWeight: '800' }}>
                {q.answer.authorPublicName}
              </AppText>
              <AppText variant="caption">{q.answer.text}</AppText>
            </View>
          ) : null}
        </Card>
      ))}
      <DemoNotice text="Perguntas demonstrativas. A área real de perguntas chega com a Comunidade." />
    </Section>
  );
}
