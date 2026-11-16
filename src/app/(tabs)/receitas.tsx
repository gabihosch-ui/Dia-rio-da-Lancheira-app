import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { RecipeRow } from '@/components/recipes/recipe-card';
import { AppText, Chip, Icon, IconButton, Row, Screen } from '@/components/ui/primitives';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useAsync } from '@/hooks/use-async';
import { services } from '@/services';
import { useDemoStore } from '@/state/demo-store';
import { colors, layout, radius, spacing } from '@/theme/tokens';

export default function RecipesScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { demoHasClubAccess, favorites } = useDemoStore();

  const [text, setText] = useState(params.q ?? '');
  const [debounced, setDebounced] = useState(text);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [freezableOnly, setFreezableOnly] = useState(false);
  const [quickOnly, setQuickOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Busca vinda da tela inicial: sincroniza quando o parâmetro muda.
  const [lastQ, setLastQ] = useState(params.q);
  if (params.q !== lastQ) {
    setLastQ(params.q);
    setText(params.q ?? '');
    setDebounced(params.q ?? '');
  }

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 300);
    return () => clearTimeout(t);
  }, [text]);

  const categories = useAsync(() => services.recipes.listCategories(), []);
  const results = useAsync(
    () => services.recipes.search({ text: debounced, categoryId, freezableOnly, quickOnly }),
    [debounced, categoryId, freezableOnly, quickOnly],
  );

  const list = results.status === 'success' ? results.data.filter((r) => !favoritesOnly || favorites.has(r.id)) : [];

  const hasFilters = !!(debounced || categoryId || freezableOnly || quickOnly || favoritesOnly);

  function clearFilters() {
    setText('');
    setDebounced('');
    setCategoryId(null);
    setFreezableOnly(false);
    setQuickOnly(false);
    setFavoritesOnly(false);
  }

  return (
    <Screen>
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
          paddingHorizontal: spacing.lg,
          minHeight: layout.minTouchTarget,
        }}>
        <Icon name="search" size={20} color={colors.textSubtle} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Buscar por nome"
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="Buscar receitas por nome"
          returnKeyType="search"
          style={{ flex: 1, fontSize: 16, color: colors.text, paddingVertical: spacing.md }}
        />
        {text ? (
          <IconButton icon="close-circle" label="Limpar busca" color={colors.textSubtle} onPress={() => setText('')} />
        ) : null}
      </Row>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="caption" color={colors.textMuted} style={{ fontWeight: '700' }}>
          Categorias
        </AppText>
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

        <AppText variant="caption" color={colors.textMuted} style={{ fontWeight: '700', marginTop: spacing.sm }}>
          Filtros
        </AppText>
        <Row gap={spacing.sm} wrap>
          <Chip label="Favoritas" emoji="❤️" selected={favoritesOnly} onPress={() => setFavoritesOnly((v) => !v)} />
          <Chip label="Congela bem" emoji="❄️" selected={freezableOnly} onPress={() => setFreezableOnly((v) => !v)} />
          <Chip label="Até 30 min" emoji="⏱️" selected={quickOnly} onPress={() => setQuickOnly((v) => !v)} />
        </Row>
      </View>

      {results.status === 'loading' ? <LoadingState label="Buscando receitas…" /> : null}
      {results.status === 'error' ? <ErrorState message={results.error.message} onRetry={results.reload} /> : null}
      {results.status === 'success' && list.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="Nenhuma receita encontrada"
          message={
            favoritesOnly ? 'Você ainda não tem favoritas com esses filtros.' : 'Tente outro nome ou remova os filtros.'
          }
          action={hasFilters ? { label: 'Limpar filtros', onPress: clearFilters } : undefined}
        />
      ) : null}

      {results.status === 'success' && list.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <AppText variant="caption" color={colors.textMuted}>
            {list.length} {list.length === 1 ? 'receita' : 'receitas'}
          </AppText>
          {list.map((r) => (
            <RecipeRow
              key={r.id}
              recipe={r}
              locked={r.isExclusive && !demoHasClubAccess}
              favorite={favorites.has(r.id)}
              onPress={() => router.push(`/receita/${r.id}`)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
