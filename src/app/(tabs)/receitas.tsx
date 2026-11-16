import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecipeCard, RecipeRow } from '@/components/recipes/recipe-card';
import { AppText, Button, Chip, Icon, IconButton, Row } from '@/components/ui/primitives';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useAsync } from '@/hooks/use-async';
import { useRecipeSearch } from '@/hooks/use-recipe-search';
import { services } from '@/services';
import { useLibrary } from '@/state/library';
import { colors, layout, radius, spacing } from '@/theme/tokens';

export default function RecipesScreen() {
  const params = useLocalSearchParams<{ q?: string; favoritas?: string }>();
  const insets = useSafeAreaInsets();
  const { access, isFavorite, refresh } = useLibrary();

  const [text, setText] = useState(params.q ?? '');
  const [debounced, setDebounced] = useState(text);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [freezableOnly, setFreezableOnly] = useState(false);
  const [quickOnly, setQuickOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(params.favoritas === '1');

  // Parâmetros vindos de outras telas (busca da tela inicial, "Favoritas" do perfil).
  const [lastParams, setLastParams] = useState(params);
  if (params.q !== lastParams.q || params.favoritas !== lastParams.favoritas) {
    setLastParams(params);
    if (params.q !== undefined) {
      setText(params.q);
      setDebounced(params.q);
    }
    if (params.favoritas === '1') setFavoritesOnly(true);
  }

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 300);
    return () => clearTimeout(t);
  }, [text]);

  const categories = useAsync(() => services.recipes.listCategories(), []);
  const hasFilters = !!(debounced.trim() || categoryId || freezableOnly || quickOnly || favoritesOnly);
  const featured = useAsync(() => services.recipes.listFeatured(8), []);
  const { state, loadMore, reload } = useRecipeSearch({
    text: debounced,
    categoryId,
    freezableOnly,
    quickOnly,
    favoritesOnly,
  });

  function clearFilters() {
    setText('');
    setDebounced('');
    setCategoryId(null);
    setFreezableOnly(false);
    setQuickOnly(false);
    setFavoritesOnly(false);
  }

  const header = (
    <View style={{ gap: spacing.xl, paddingBottom: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="display">Receitas</AppText>
        <AppText color={colors.textMuted}>Receitas oficiais do Diário da Lancheira</AppText>
      </View>

      <Row
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: colors.border,
          paddingLeft: spacing.lg,
          minHeight: layout.minTouchTarget,
        }}>
        <Icon name="search" size={20} color={colors.textSubtle} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Buscar pelo nome da receita"
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="Buscar receitas pelo nome"
          returnKeyType="search"
          autoCorrect={false}
          style={{ flex: 1, fontSize: 16, color: colors.text, paddingVertical: spacing.md }}
        />
        {text ? (
          <IconButton icon="close-circle" label="Limpar busca" color={colors.textSubtle} onPress={() => setText('')} />
        ) : null}
      </Row>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.lg }}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
        <Chip label="Todas" selected={!categoryId} onPress={() => setCategoryId(null)} />
        {categories.status === 'success'
          ? categories.data.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                emoji={c.emoji}
                selected={categoryId === c.id}
                onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
              />
            ))
          : null}
      </ScrollView>

      <Row gap={spacing.sm} wrap>
        <Chip label="Favoritas" emoji="❤️" selected={favoritesOnly} onPress={() => setFavoritesOnly((v) => !v)} />
        <Chip label="Congela bem" emoji="❄️" selected={freezableOnly} onPress={() => setFreezableOnly((v) => !v)} />
        <Chip label="Até 30 min" emoji="⏱️" selected={quickOnly} onPress={() => setQuickOnly((v) => !v)} />
      </Row>

      {!hasFilters && featured.status === 'success' && featured.data.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <AppText variant="subtitle">Em destaque</AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -spacing.lg }}
            contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}>
            {featured.data.map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                width={200}
                locked={r.isExclusive && !access.hasAccess}
                favorite={isFavorite(r.id)}
                onPress={() => router.push(`/receita/${r.id}`)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {state.status === 'ready' && state.items.length > 0 ? (
        <AppText variant="subtitle">{hasFilters ? 'Resultados' : 'Todas as receitas'}</AppText>
      ) : null}
    </View>
  );

  const footer =
    state.status === 'ready' ? (
      state.loadingMore ? (
        <ActivityIndicator color={colors.accent} style={{ paddingVertical: spacing.xl }} />
      ) : state.moreError ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Button label="Carregar mais" variant="secondary" small onPress={loadMore} />
        </View>
      ) : undefined
    ) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center' }}>
      <FlatList
        style={{ width: '100%', maxWidth: layout.maxContentWidth }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxxl,
          gap: spacing.md,
        }}
        data={state.status === 'ready' ? state.items : []}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          state.status === 'loading' ? (
            <LoadingState label="Buscando receitas…" />
          ) : state.status === 'error' ? (
            <ErrorState message={state.message} onRetry={reload} />
          ) : (
            <EmptyState
              icon={favoritesOnly ? 'heart-outline' : 'search-outline'}
              title={favoritesOnly ? 'Nenhuma favorita por aqui' : 'Nenhuma receita encontrada'}
              message={
                favoritesOnly
                  ? 'Toque no coração de uma receita para guardá-la aqui.'
                  : hasFilters
                    ? 'Tente outro nome ou remova os filtros.'
                    : 'As receitas aparecerão aqui assim que forem publicadas.'
              }
              action={hasFilters ? { label: 'Limpar filtros', onPress: clearFilters } : undefined}
            />
          )
        }
        renderItem={({ item }) => (
          <RecipeRow
            recipe={item}
            locked={item.isExclusive && !access.hasAccess}
            favorite={isFavorite(item.id)}
            onPress={() => router.push(`/receita/${item.id}`)}
          />
        )}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              reload();
              refresh();
            }}
            tintColor={colors.accent}
          />
        }
      />
    </View>
  );
}
