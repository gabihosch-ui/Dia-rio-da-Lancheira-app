import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { PostCard } from '@/components/community/post-card';
import { RecipeCard, RecipeCover } from '@/components/recipes/recipe-card';
import { DemoNotice, LogoPlaceholder } from '@/components/ui/brand';
import { AppText, Badge, Button, Card, Icon, IconButton, Row, Screen, Section } from '@/components/ui/primitives';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useAsync } from '@/hooks/use-async';
import { useMe } from '@/hooks/use-me';
import { greeting } from '@/lib/format';
import { services } from '@/services';
import { useDemoStore } from '@/state/demo-store';
import { colors, layout, radius, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const { demoHasClubAccess, favorites, weeks, localPosts } = useDemoStore();
  const me = useMe();
  const [query, setQuery] = useState('');

  const data = useAsync(async () => {
    const [recipes, posts, notifications] = await Promise.all([
      services.recipes.search({}),
      services.community.listPosts(),
      services.catalog.listNotifications(),
    ]);
    return { recipes, posts, unread: notifications.filter((n) => !n.read).length };
  }, []);

  const activeWeek = weeks.find((w) => w.status === 'ativo');
  const draftWeek = weeks.find((w) => w.status === 'rascunho');

  function submitSearch() {
    router.push({ pathname: '/receitas', params: { q: query.trim() } });
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <LogoPlaceholder />
        <IconButton
          icon="notifications-outline"
          label="Notificações"
          badge={data.status === 'success' ? data.data.unread : undefined}
          onPress={() => router.push('/notificacoes')}
        />
      </Row>

      <View style={{ gap: spacing.xs }}>
        <AppText variant="display">
          {greeting()}
          {me ? `, ${me.fullName.split(' ')[0]}` : ''}!
        </AppText>
        <AppText color={colors.textMuted}>O que vai para a lancheira esta semana?</AppText>
      </View>

      <Row
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: colors.border,
          paddingHorizontal: spacing.lg,
          minHeight: layout.minTouchTarget,
        }}>
        <Icon name="search" size={20} color={colors.textSubtle} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submitSearch}
          returnKeyType="search"
          placeholder="Buscar receitas"
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="Buscar receitas"
          style={{ flex: 1, fontSize: 16, color: colors.text, paddingVertical: spacing.md }}
        />
      </Row>

      {!demoHasClubAccess ? (
        <Card tone="primary" onPress={() => router.push('/assinatura')} accessibilityLabel="Conhecer o Clube">
          <Row gap={spacing.md}>
            <Icon name="star" size={28} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong" color={colors.textTitle}>
                Clube Diário da Lancheira
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                Receitas em vídeo, Planejador e comunidade por R$ 24,90/mês.
              </AppText>
            </View>
            <Icon name="chevron-forward" color={colors.textTitle} />
          </Row>
        </Card>
      ) : null}

      {data.status === 'loading' ? <LoadingState /> : null}
      {data.status === 'error' ? <ErrorState message={data.error.message} onRetry={data.reload} /> : null}

      {data.status === 'success' ? (
        <>
          {data.data.recipes[0] ? (
            <Section title="Receita em destaque">
              <Card
                onPress={() => router.push(`/receita/${data.data.recipes[0].id}`)}
                accessibilityLabel={`Receita em destaque: ${data.data.recipes[0].title}`}
                style={{ padding: 0, overflow: 'hidden' }}>
                <RecipeCover recipe={data.data.recipes[0]} height={180} rounded={false} />
                <View style={{ padding: spacing.lg, gap: spacing.xs }}>
                  <Badge label="Nova no Clube" tone="accent" icon="sparkles" />
                  <AppText variant="title">{data.data.recipes[0].title}</AppText>
                  <AppText color={colors.textMuted}>{data.data.recipes[0].shortDescription}</AppText>
                </View>
              </Card>
            </Section>
          ) : null}

          <Section title="Novas receitas" action={{ label: 'Ver todas', onPress: () => router.push('/receitas') }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.xs, paddingRight: spacing.lg }}
              style={{ marginHorizontal: -spacing.lg, paddingLeft: spacing.lg }}>
              {data.data.recipes.slice(1, 7).map((r) => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  width={168}
                  locked={r.isExclusive && !demoHasClubAccess}
                  favorite={favorites.has(r.id)}
                  onPress={() => router.push(`/receita/${r.id}`)}
                />
              ))}
            </ScrollView>
          </Section>
        </>
      ) : null}

      <Section title="Planejador">
        <Card tone="info" style={{ gap: spacing.md }}>
          <Row gap={spacing.md}>
            <Icon name="calendar" size={28} color={colors.textTitle} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong" color={colors.textTitle}>
                {activeWeek ? activeWeek.title : 'Nenhuma semana ativa'}
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {draftWeek
                  ? `Rascunho: ${draftWeek.title} (etapa ${draftWeek.currentStep} de 6)`
                  : 'Monte o cardápio da semana em 6 etapas.'}
              </AppText>
            </View>
          </Row>
          <Row gap={spacing.sm} wrap>
            {draftWeek ? (
              <Button label="Continuar rascunho" small onPress={() => router.push(`/planejador/${draftWeek.id}`)} />
            ) : null}
            <Button label="Abrir Planejador" small variant="secondary" onPress={() => router.push('/planejador')} />
          </Row>
        </Card>
      </Section>

      {data.status === 'success' ? (
        <Section title="Na comunidade" action={{ label: 'Ver feed', onPress: () => router.push('/comunidade') }}>
          {[...localPosts, ...data.data.posts].slice(0, 2).map((p) => (
            <PostCard key={p.id} post={p} compact onPress={() => router.push(`/comunidade/${p.id}`)} />
          ))}
        </Section>
      ) : null}

      <DemoNotice text="Protótipo da Fase 1: todos os dados exibidos são demonstrativos e ficam somente neste aparelho." />
    </Screen>
  );
}
