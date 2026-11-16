import { router } from 'expo-router';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Card, Icon, Row } from '@/components/ui/primitives';
import { notify } from '@/lib/notify';
import { useDemoStore } from '@/state/demo-store';
import { colors, layout, radius, spacing } from '@/theme/tokens';

/** Folha para escolher em qual semana incluir a receita (referência única de receita). */
export function AddToPlannerSheet({
  visible,
  recipeId,
  onClose,
}: {
  visible: boolean;
  recipeId: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { weeks, addRecipeToWeek, createWeek, plannerRules } = useDemoStore();
  const editable = weeks.filter((w) => w.status !== 'arquivado');

  function add(weekId: string, title: string) {
    const result = addRecipeToWeek(weekId, recipeId);
    onClose();
    if (result === 'adicionada') notify('Receita adicionada', `Incluída em "${title}".`);
    else if (result === 'ja-existe') notify('Já está nesta semana', `A receita já faz parte de "${title}".`);
    else notify('Limite atingido', `Cada semana pode ter no máximo ${plannerRules.maxRecipes} receitas.`);
  }

  function addToNew() {
    const week = createWeek();
    onClose();
    // A nova semana ainda não está no estado ao criar; abre a etapa 1 já com a receita sugerida.
    router.push({ pathname: '/planejador/[id]', params: { id: week.id, add: recipeId } });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} accessibilityLabel="Fechar" />
      <View
        style={{
          backgroundColor: colors.background,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          gap: spacing.md,
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
        }}>
        <AppText variant="title">Adicionar ao Planejador</AppText>
        <AppText color={colors.textMuted}>Escolha a semana:</AppText>
        {editable.map((w) => (
          <Card key={w.id} onPress={() => add(w.id, w.title)} accessibilityLabel={`Adicionar em ${w.title}`}>
            <Row gap={spacing.md}>
              <Icon name="calendar-outline" color={colors.accent} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" color={colors.textTitle}>
                  {w.title}
                </AppText>
                <AppText variant="small" color={colors.textSubtle}>
                  {w.status === 'ativo' ? 'Ativa' : 'Rascunho'} · {w.recipeIds.length}/{plannerRules.maxRecipes}{' '}
                  receitas
                </AppText>
              </View>
              <Icon name="add-circle" color={colors.textTitle} />
            </Row>
          </Card>
        ))}
        <Button label="Criar nova semana" icon="add" variant="secondary" onPress={addToNew} />
        <Button label="Cancelar" variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}
