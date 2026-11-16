import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { RecipeCover } from '@/components/recipes/recipe-card';
import { AppText, Badge, Card, Chip, Divider, Icon, Row, Section } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/states';
import { demoUnits } from '@/data/demo/recipes';
import {
  WEEK_DAYS,
  WEEK_DAY_LABELS,
  type PlannerRules,
  type PlannerWeek,
  type Recipe,
  type SideItem,
  type SideItemKind,
  type WeekDay,
} from '@/domain/models';
import {
  aggregateIngredients,
  buildShoppingList,
  formatQuantity,
  toggleRecipe,
  type ShoppingItem,
} from '@/lib/planner';
import { colors, layout, radius, spacing } from '@/theme/tokens';

export interface StepProps {
  week: PlannerWeek;
  onChange: (week: PlannerWeek) => void;
  recipes: Recipe[];
  sideItems: SideItem[];
  rules: PlannerRules;
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: checked ? colors.accent : colors.borderStrong,
        backgroundColor: checked ? colors.accent : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {checked ? <Icon name="checkmark" size={18} color={colors.textOnAccent} /> : null}
    </View>
  );
}

function CheckRow({
  checked,
  onPress,
  label,
  children,
  disabled,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled: !!disabled }}
      aria-checked={checked}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: layout.minTouchTarget,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}>
      <Checkbox checked={checked} />
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

const recipeTitle = (recipes: Recipe[], id: string) => recipes.find((r) => r.id === id)?.title ?? 'Receita';

// ---------- Etapa 1 ----------

export function StepChooseRecipes({ week, onChange, recipes, rules }: StepProps) {
  const count = week.recipeIds.length;
  const full = count >= rules.maxRecipes;
  return (
    <>
      <Card tone={count >= rules.minRecipes ? 'success' : 'primary'}>
        <AppText variant="bodyStrong" color={colors.textTitle}>
          {count} de {rules.maxRecipes} receitas selecionadas
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          Escolha de {rules.minRecipes} a {rules.maxRecipes} receitas para a semana.
        </AppText>
      </Card>
      {recipes.map((r) => {
        const checked = week.recipeIds.includes(r.id);
        return (
          <Card key={r.id} style={{ padding: spacing.sm }}>
            <CheckRow
              checked={checked}
              disabled={!checked && full}
              label={r.title}
              onPress={() => onChange({ ...week, recipeIds: toggleRecipe(week.recipeIds, r.id, rules) })}>
              <Row gap={spacing.md}>
                <View style={{ width: 56 }}>
                  <RecipeCover recipe={r} height={56} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong" color={colors.textTitle} numberOfLines={2}>
                    {r.title}
                  </AppText>
                  <AppText variant="small" color={colors.textSubtle}>
                    {r.prepMinutes} min · {r.yieldLabel}
                  </AppText>
                </View>
              </Row>
            </CheckRow>
          </Card>
        );
      })}
    </>
  );
}

// ---------- Etapa 2 ----------

export function StepPrep({ week, onChange, recipes }: StepProps) {
  return (
    <>
      <AppText color={colors.textMuted}>
        Indique quais receitas você vai preparar e quais já estão prontas (por exemplo, congeladas). Apenas as que serão
        preparadas entram na lista de compras.
      </AppText>
      {week.recipeIds.map((id) => {
        const status = week.prepStatus[id];
        const set = (s: 'preparar' | 'pronta') => onChange({ ...week, prepStatus: { ...week.prepStatus, [id]: s } });
        return (
          <Card key={id} style={{ gap: spacing.md }}>
            <AppText variant="bodyStrong" color={colors.textTitle}>
              {recipeTitle(recipes, id)}
            </AppText>
            <Row gap={spacing.sm} wrap>
              <Chip label="Vou preparar" emoji="👩‍🍳" selected={status === 'preparar'} onPress={() => set('preparar')} />
              <Chip label="Já está pronta" emoji="❄️" selected={status === 'pronta'} onPress={() => set('pronta')} />
            </Row>
          </Card>
        );
      })}
    </>
  );
}

// ---------- Etapa 3 ----------

export function StepDistribute({ week, onChange, recipes }: StepProps) {
  function toggle(day: WeekDay, recipeId: string) {
    const current = week.days[day].recipeIds;
    const next = current.includes(recipeId) ? current.filter((x) => x !== recipeId) : [...current, recipeId];
    onChange({ ...week, days: { ...week.days, [day]: { ...week.days[day], recipeIds: next } } });
  }
  return (
    <>
      <AppText color={colors.textMuted}>
        Toque nas receitas para colocá-las em cada dia. Um dia pode ter mais de uma.
      </AppText>
      {WEEK_DAYS.map((day) => (
        <Card key={day} style={{ gap: spacing.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText variant="bodyStrong" color={colors.textTitle}>
              {WEEK_DAY_LABELS[day]}
            </AppText>
            {week.days[day].recipeIds.length === 0 ? <Badge label="vazio" tone="neutral" /> : null}
          </Row>
          <Row gap={spacing.sm} wrap>
            {week.recipeIds.map((id) => (
              <Chip
                key={id}
                label={recipeTitle(recipes, id)}
                selected={week.days[day].recipeIds.includes(id)}
                onPress={() => toggle(day, id)}
              />
            ))}
          </Row>
        </Card>
      ))}
    </>
  );
}

// ---------- Etapa 4 ----------

const KIND_TITLES: Record<SideItemKind, string> = {
  fruta: 'Frutas',
  proteina: 'Proteínas',
  acompanhamento: 'Acompanhamentos',
};

export function StepSides({ week, onChange, sideItems }: StepProps) {
  const [day, setDay] = useState<WeekDay>('seg');
  function toggle(itemId: string) {
    const current = week.days[day].sideItemIds;
    const next = current.includes(itemId) ? current.filter((x) => x !== itemId) : [...current, itemId];
    onChange({ ...week, days: { ...week.days, [day]: { ...week.days[day], sideItemIds: next } } });
  }
  return (
    <>
      <AppText color={colors.textMuted}>
        Escolha o dia e adicione frutas, proteínas e acompanhamentos. Esta etapa é opcional.
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.lg }}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
        {WEEK_DAYS.map((d) => (
          <Chip
            key={d}
            label={`${WEEK_DAY_LABELS[d]}${week.days[d].sideItemIds.length ? ` (${week.days[d].sideItemIds.length})` : ''}`}
            selected={d === day}
            onPress={() => setDay(d)}
          />
        ))}
      </ScrollView>
      {(['fruta', 'proteina', 'acompanhamento'] as SideItemKind[]).map((kind) => (
        <Section key={kind} title={KIND_TITLES[kind]}>
          <Row gap={spacing.sm} wrap>
            {sideItems
              .filter((i) => i.kind === kind)
              .map((i) => (
                <Chip
                  key={i.id}
                  label={i.name}
                  emoji={i.emoji}
                  selected={week.days[day].sideItemIds.includes(i.id)}
                  onPress={() => toggle(i.id)}
                />
              ))}
          </Row>
        </Section>
      ))}
      <Pressable accessibilityRole="button" disabled style={{ opacity: 0.5 }}>
        <AppText variant="caption" color={colors.textMuted}>
          + Itens personalizados (em breve)
        </AppText>
      </Pressable>
    </>
  );
}

// ---------- Etapa 5 ----------

export function StepPantry({ week, onChange, recipes }: StepProps) {
  const items = aggregateIngredients(week, recipes);
  const pantry = new Set(week.pantryIngredientIds);
  if (items.length === 0) {
    return (
      <EmptyState
        icon="basket-outline"
        title="Nada para conferir"
        message="Todas as receitas desta semana já estão prontas."
      />
    );
  }
  return (
    <>
      <AppText color={colors.textMuted}>
        Marque o que você já tem em casa. O restante vai para a lista de compras.
      </AppText>
      <Card style={{ gap: spacing.xs }}>
        {items.map((i, idx) => (
          <View key={i.ingredientId}>
            {idx > 0 ? <Divider /> : null}
            <CheckRow
              checked={pantry.has(i.ingredientId)}
              label={`${i.name}: tenho em casa`}
              onPress={() => {
                const next = new Set(pantry);
                if (next.has(i.ingredientId)) next.delete(i.ingredientId);
                else next.add(i.ingredientId);
                onChange({ ...week, pantryIngredientIds: [...next] });
              }}>
              <AppText>{i.name}</AppText>
              <AppText variant="small" color={colors.textSubtle}>
                {quantityLabel(i)}
              </AppText>
            </CheckRow>
          </View>
        ))}
      </Card>
    </>
  );
}

function quantityLabel(i: ShoppingItem) {
  const parts = Object.entries(i.quantities).map(
    ([unit, q]) => `${formatQuantity(q)} ${demoUnits.find((u) => u.id === unit)?.abbreviation ?? unit}`,
  );
  return parts.length ? parts.join(' + ') : 'a gosto';
}

// ---------- Etapa 6 ----------

export function StepSummary({ week, recipes, sideItems }: StepProps) {
  const shopping = buildShoppingList(week, recipes);
  const sideName = (id: string) => {
    const s = sideItems.find((x) => x.id === id);
    return s ? `${s.emoji} ${s.name}` : id;
  };
  return (
    <>
      <Section title="Cardápio da semana">
        {WEEK_DAYS.map((day) => (
          <Card key={day} style={{ gap: spacing.xs }}>
            <AppText variant="bodyStrong" color={colors.accent}>
              {WEEK_DAY_LABELS[day]}
            </AppText>
            {week.days[day].recipeIds.length === 0 && week.days[day].sideItemIds.length === 0 ? (
              <AppText color={colors.textSubtle}>Nada planejado</AppText>
            ) : null}
            {week.days[day].recipeIds.map((id) => (
              <Row key={id} gap={spacing.sm}>
                <Icon name="restaurant" size={16} color={colors.textTitle} />
                <AppText style={{ flex: 1 }}>{recipeTitle(recipes, id)}</AppText>
                {week.prepStatus[id] === 'pronta' ? <Badge label="pronta" tone="info" /> : null}
              </Row>
            ))}
            {week.days[day].sideItemIds.length > 0 ? (
              <AppText variant="caption" color={colors.textMuted}>
                {week.days[day].sideItemIds.map(sideName).join(' · ')}
              </AppText>
            ) : null}
          </Card>
        ))}
      </Section>

      <Section title={`Lista de compras (${shopping.length})`}>
        {shopping.length === 0 ? (
          <Card tone="success">
            <AppText>Você já tem tudo em casa. 🎉</AppText>
          </Card>
        ) : (
          <Card style={{ gap: spacing.sm }}>
            {shopping.map((i) => (
              <Row key={i.ingredientId} gap={spacing.md}>
                <View style={{ width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.primary }} />
                <AppText style={{ flex: 1 }}>{i.name}</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {quantityLabel(i)}
                </AppText>
              </Row>
            ))}
          </Card>
        )}
      </Section>
    </>
  );
}
