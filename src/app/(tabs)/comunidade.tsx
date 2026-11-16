import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { PostCard } from '@/components/community/post-card';
import { ClubGate } from '@/components/recipes/club-gate';
import { AppText, Button, Chip, Row, Screen } from '@/components/ui/primitives';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import type { CommunityPost } from '@/domain/models';
import { useAsync } from '@/hooks/use-async';
import { services } from '@/services';
import { useDemoStore } from '@/state/demo-store';
import { colors, spacing } from '@/theme/tokens';

type Filter = 'geral' | 'minhas-receitas' | 'duvidas' | 'dicas' | 'minhas';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'geral', label: 'Feed geral' },
  { id: 'minhas-receitas', label: 'Minhas receitas' },
  { id: 'duvidas', label: 'Dúvidas' },
  { id: 'dicas', label: 'Dicas' },
  { id: 'minhas', label: 'Minhas publicações' },
];

function applyFilter(posts: CommunityPost[], filter: Filter, myId: string) {
  switch (filter) {
    case 'minhas-receitas':
      return posts.filter((p) => p.kind === 'minha-receita');
    case 'duvidas':
      return posts.filter((p) => p.kind === 'pergunta');
    case 'dicas':
      return posts.filter((p) => p.kind === 'dica');
    case 'minhas':
      return posts.filter((p) => p.author.id === myId);
    default:
      return posts;
  }
}

export default function CommunityScreen() {
  const { me, localPosts, demoHasClubAccess } = useDemoStore();
  const [filter, setFilter] = useState<Filter>('geral');
  const posts = useAsync(() => services.community.listPosts(), []);

  const list = posts.status === 'success' ? applyFilter([...localPosts, ...posts.data], filter, me.id) : [];

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="display">Comunidade</AppText>
          <AppText color={colors.textMuted}>Fotos, relatos, dicas e dúvidas</AppText>
        </View>
      </Row>

      {demoHasClubAccess ? (
        <Button label="Nova publicação" icon="create-outline" onPress={() => router.push('/comunidade/nova')} />
      ) : (
        <ClubGate
          title="Participe da comunidade"
          message="Assinantes do Clube podem publicar fotos, relatos e perguntas. Você pode ver uma prévia do feed abaixo."
        />
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.lg }}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
        {FILTERS.map((f) => (
          <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </ScrollView>

      {posts.status === 'loading' ? <LoadingState /> : null}
      {posts.status === 'error' ? <ErrorState message={posts.error.message} onRetry={posts.reload} /> : null}
      {posts.status === 'success' && list.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="Nada por aqui ainda"
          message={
            filter === 'minhas' ? 'Suas publicações aparecerão aqui.' : 'Ainda não há publicações nesta categoria.'
          }
        />
      ) : null}
      {list.map((p) => (
        <PostCard key={p.id} post={p} onPress={() => router.push(`/comunidade/${p.id}`)} />
      ))}

      <AppText variant="small" color={colors.textSubtle} align="center">
        Mensagens privadas entre membros não fazem parte do lançamento.
      </AppText>
    </Screen>
  );
}
