import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { POST_KIND_META } from '@/components/community/post-card';
import { DemoNotice } from '@/components/ui/brand';
import { AppText, Button, Chip, Icon, Row, Screen } from '@/components/ui/primitives';
import type { PostKind } from '@/domain/models';
import { notify, notYet } from '@/lib/notify';
import { useDemoStore } from '@/state/demo-store';
import { colors, radius, spacing } from '@/theme/tokens';

const MAX_LENGTH = 1000;
const KINDS: PostKind[] = ['relato', 'pergunta', 'dica', 'minha-receita'];

export default function NewPostScreen() {
  const { addLocalPost, demoHasClubAccess } = useDemoStore();
  const [kind, setKind] = useState<PostKind>('relato');
  const [text, setText] = useState('');
  const trimmed = text.trim();
  const tooShort = trimmed.length < 3;

  function publish() {
    if (!demoHasClubAccess) {
      notify('Benefício do Clube', 'Publicar na comunidade é exclusivo para assinantes.');
      return;
    }
    addLocalPost(kind, trimmed);
    router.back();
    notify(
      'Publicação criada (demonstração)',
      'Ela aparece apenas neste aparelho. Na versão final, passará pelas regras de moderação antes de ser exibida.',
    );
  }

  return (
    <Screen hasHeader footer={<Button label="Publicar" icon="send" fullWidth disabled={tooShort} onPress={publish} />}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="subtitle">Tipo de publicação</AppText>
        <Row gap={spacing.sm} wrap>
          {KINDS.map((k) => (
            <Chip key={k} label={POST_KIND_META[k].label} selected={kind === k} onPress={() => setKind(k)} />
          ))}
        </Row>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="subtitle">Texto</AppText>
        <TextInput
          value={text}
          onChangeText={(t) => setText(t.slice(0, MAX_LENGTH))}
          multiline
          placeholder={kind === 'pergunta' ? 'Escreva sua dúvida…' : 'Conte como foi…'}
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="Texto da publicação"
          style={{
            minHeight: 160,
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderWidth: 1.5,
            borderColor: colors.border,
            padding: spacing.md,
            fontSize: 16,
            color: colors.text,
            textAlignVertical: 'top',
          }}
        />
        <AppText variant="small" color={colors.textSubtle} align="right">
          {text.length}/{MAX_LENGTH}
        </AppText>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="subtitle">Fotos</AppText>
        <Row gap={spacing.sm}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                aspectRatio: 1,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: colors.borderStrong,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name="image-outline" color={colors.textSubtle} />
            </View>
          ))}
        </Row>
        <Button
          label="Adicionar fotos"
          icon="camera-outline"
          variant="secondary"
          small
          onPress={() => notYet('Envio de fotos', 'Fase 6, com validação de formato e tamanho e remoção de metadados')}
        />
      </View>

      <DemoNotice text="Lembre-se das regras de convivência: respeito, nada de dados pessoais de crianças e nenhum conteúdo comercial." />
    </Screen>
  );
}
