import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { PostCard } from '@/components/community/post-card';
import { AppText, Avatar, Button, Card, Row, Screen, Section } from '@/components/ui/primitives';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useAsync } from '@/hooks/use-async';
import { formatRelative } from '@/lib/format';
import { notYet } from '@/lib/notify';
import { services } from '@/services';
import { useDemoStore } from '@/state/demo-store';
import { colors, spacing } from '@/theme/tokens';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { localPosts, demoHasClubAccess } = useDemoStore();
  const local = localPosts.find((p) => p.id === id);
  const remote = useAsync(() => (local ? Promise.resolve(local) : services.community.getPost(id)), [id]);

  if (remote.status === 'loading')
    return (
      <Screen hasHeader>
        <LoadingState />
      </Screen>
    );
  if (remote.status === 'error')
    return (
      <Screen hasHeader>
        <ErrorState message={remote.error.message} onRetry={remote.reload} />
      </Screen>
    );
  const post = remote.data;
  if (!post)
    return (
      <Screen hasHeader>
        <EmptyState title="Publicação não encontrada" message="Ela pode ter sido removida." />
      </Screen>
    );

  return (
    <Screen hasHeader>
      <PostCard post={post} />
      <Section title={`Comentários (${post.comments.length})`}>
        {post.comments.length === 0 ? (
          <AppText color={colors.textMuted}>Seja a primeira pessoa a comentar.</AppText>
        ) : null}
        {post.comments.map((c) => (
          <Card key={c.id}>
            <Row gap={spacing.md} style={{ alignItems: 'flex-start' }}>
              <Avatar initials={c.author.avatarInitials} size={32} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="caption" color={colors.textTitle} style={{ fontWeight: '800' }}>
                  {c.author.publicName}{' '}
                  <AppText variant="small" color={colors.textSubtle}>
                    · {formatRelative(c.createdAt)}
                  </AppText>
                </AppText>
                <AppText>{c.text}</AppText>
              </View>
            </Row>
          </Card>
        ))}
        <Button
          label="Comentar"
          icon="chatbubble-outline"
          variant="secondary"
          disabled={!demoHasClubAccess}
          onPress={() => notYet('Comentários', 'Fase 6 (Comunidade)')}
        />
        {!demoHasClubAccess ? (
          <AppText variant="caption" color={colors.textMuted} align="center">
            Comentar é um benefício do Clube.
          </AppText>
        ) : null}
      </Section>
    </Screen>
  );
}
