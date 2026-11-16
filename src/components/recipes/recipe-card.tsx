import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Badge, Icon, Row } from '@/components/ui/primitives';
import type { RecipeSummary } from '@/domain/models';
import { colors, coverTints, radius, shadow, spacing } from '@/theme/tokens';

function tintFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return coverTints[h % coverTints.length];
}

/**
 * Capa da receita. Sem foto real, mostra um espaço reservado colorido.
 * Na Fase 4 as fotos virão do armazenamento (URLs assinadas quando exclusivas).
 */
export function RecipeCover({
  recipe,
  height = 140,
  rounded = true,
}: {
  recipe: Pick<RecipeSummary, 'id' | 'coverEmoji' | 'coverUri' | 'title'>;
  height?: number;
  rounded?: boolean;
}) {
  const r = rounded ? radius.lg : 0;
  if (recipe.coverUri) {
    return (
      <Image
        source={{ uri: recipe.coverUri }}
        style={{ height, borderRadius: r, width: '100%' }}
        contentFit="cover"
        accessibilityLabel={`Foto: ${recipe.title}`}
      />
    );
  }
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Foto ilustrativa: ${recipe.title}`}
      style={{
        height,
        borderRadius: r,
        backgroundColor: tintFor(recipe.id),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <AppText style={{ fontSize: height * 0.38, lineHeight: height * 0.5 }}>{recipe.coverEmoji}</AppText>
      {height >= 100 ? (
        <View style={styles.photoTag}>
          <AppText variant="small" color={colors.textSubtle} style={{ fontSize: 10 }}>
            foto ilustrativa
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function Meta({ recipe }: { recipe: RecipeSummary }) {
  return (
    <Row gap={spacing.md} wrap>
      <Row gap={4}>
        <Icon name="time-outline" size={14} color={colors.textMuted} />
        <AppText variant="small" color={colors.textMuted}>
          {recipe.prepMinutes} min
        </AppText>
      </Row>
      <Row gap={4}>
        <Icon name="restaurant-outline" size={14} color={colors.textMuted} />
        <AppText variant="small" color={colors.textMuted}>
          {recipe.yieldLabel}
        </AppText>
      </Row>
      {recipe.freezable ? (
        <Row gap={4}>
          <Icon name="snow-outline" size={14} color={colors.info} />
          <AppText variant="small" color={colors.textMuted}>
            Congela
          </AppText>
        </Row>
      ) : null}
    </Row>
  );
}

interface CardProps {
  recipe: RecipeSummary;
  onPress: () => void;
  locked: boolean;
  favorite?: boolean;
}

/** Cartão vertical, usado em carrosséis e grades. */
export function RecipeCard({ recipe, onPress, locked, favorite, width }: CardProps & { width?: number }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${recipe.title}. ${recipe.prepMinutes} minutos. ${locked ? 'Exclusiva do Clube.' : ''}`}
      style={({ pressed }) => [styles.card, width ? { width } : null, pressed && { opacity: 0.85 }]}>
      <View>
        <RecipeCover recipe={recipe} height={120} />
        <TopBadges locked={locked} favorite={favorite} />
      </View>
      <View style={{ gap: 6, padding: spacing.md }}>
        {recipe.isOfficial ? <Badge label="Oficial" tone="accent" icon="checkmark-circle" /> : null}
        <AppText variant="bodyStrong" color={colors.textTitle} numberOfLines={2}>
          {recipe.title}
        </AppText>
        <Meta recipe={recipe} />
      </View>
    </Pressable>
  );
}

/** Linha horizontal, usada na lista do catálogo. */
export function RecipeRow({ recipe, onPress, locked, favorite }: CardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${recipe.title}. ${recipe.prepMinutes} minutos. ${locked ? 'Exclusiva do Clube.' : ''}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <View style={{ width: 104 }}>
        <RecipeCover recipe={recipe} height={104} />
        <TopBadges locked={locked} favorite={favorite} />
      </View>
      <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
        <Row gap={6} wrap>
          {recipe.isOfficial ? <Badge label="Oficial" tone="accent" icon="checkmark-circle" /> : null}
          {!recipe.isExclusive ? <Badge label="Amostra grátis" tone="success" /> : null}
        </Row>
        <AppText variant="bodyStrong" color={colors.textTitle} numberOfLines={2}>
          {recipe.title}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={2}>
          {recipe.shortDescription}
        </AppText>
        <Meta recipe={recipe} />
      </View>
    </Pressable>
  );
}

function TopBadges({ locked, favorite }: { locked: boolean; favorite?: boolean }) {
  return (
    <>
      {locked ? (
        <View style={[styles.floating, { left: 6 }]} accessibilityLabel="Exclusiva do Clube">
          <Icon name="lock-closed" size={14} color={colors.textTitle} />
        </View>
      ) : null}
      {favorite ? (
        <View style={[styles.floating, { right: 6 }]} accessibilityLabel="Favorita">
          <Icon name="heart" size={14} color={colors.accent} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...shadow.card },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    ...shadow.card,
  },
  floating: {
    position: 'absolute',
    top: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTag: { position: 'absolute', bottom: 4, right: 8 },
});
