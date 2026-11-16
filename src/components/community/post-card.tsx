import { Pressable, View } from 'react-native';

import { AppText, Avatar, Badge, Card, Icon, Row } from '@/components/ui/primitives';
import type { CommunityPost, PostKind } from '@/domain/models';
import { formatRelative } from '@/lib/format';
import { notify } from '@/lib/notify';
import { useDemoStore } from '@/state/demo-store';
import { colors, coverTints, radius, spacing } from '@/theme/tokens';

export const POST_KIND_META: Record<PostKind, { label: string; tone: 'accent' | 'info' | 'success' | 'warning' }> = {
  relato: { label: 'Relato', tone: 'success' },
  pergunta: { label: 'Pergunta', tone: 'info' },
  dica: { label: 'Dica', tone: 'warning' },
  'minha-receita': { label: 'Minha receita', tone: 'accent' },
};

export function reportPost() {
  notify(
    'Denunciar publicação',
    'Na versão final, a denúncia será enviada à moderação com o motivo escolhido. Neste protótipo nada é enviado.',
  );
}

export function PostCard({ post, onPress, compact }: { post: CommunityPost; onPress?: () => void; compact?: boolean }) {
  const { isLiked, toggleLike } = useDemoStore();
  const liked = isLiked(post);
  const likeCount = post.likeCount + (liked && !post.likedByMe ? 1 : 0) - (!liked && post.likedByMe ? 1 : 0);
  const kind = POST_KIND_META[post.kind];

  return (
    <Card style={{ gap: spacing.md }}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `Abrir publicação de ${post.author.publicName}` : undefined}
        style={({ pressed }) => ({ gap: spacing.md, opacity: pressed ? 0.8 : 1 })}>
        <Row gap={spacing.md}>
          <Avatar initials={post.author.avatarInitials} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong" color={colors.textTitle}>
              {post.author.publicName}
            </AppText>
            <AppText variant="small" color={colors.textSubtle}>
              {formatRelative(post.createdAt)}
            </AppText>
          </View>
          <Badge label={kind.label} tone={kind.tone} />
        </Row>

        <AppText numberOfLines={compact ? 3 : undefined}>{post.text}</AppText>

        {post.imageEmojis.length > 0 && !compact ? (
          <Row gap={spacing.sm}>
            {post.imageEmojis.map((e, i) => (
              <View
                key={i}
                accessibilityRole="image"
                accessibilityLabel="Foto ilustrativa da publicação"
                style={{
                  flex: 1,
                  height: 120,
                  borderRadius: radius.md,
                  backgroundColor: coverTints[i % coverTints.length],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <AppText style={{ fontSize: 44, lineHeight: 56 }}>{e}</AppText>
              </View>
            ))}
          </Row>
        ) : null}
      </Pressable>

      {post.isLocalDemo ? (
        <Badge label="Somente neste aparelho (demonstração)" tone="neutral" icon="phone-portrait-outline" />
      ) : null}

      {!compact ? (
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={spacing.lg}>
            <Pressable
              onPress={() => toggleLike(post)}
              accessibilityRole="button"
              accessibilityLabel={liked ? 'Descurtir' : 'Curtir'}
              accessibilityState={{ selected: liked }}
              hitSlop={10}>
              <Row gap={4}>
                <Icon name={liked ? 'heart' : 'heart-outline'} color={liked ? colors.accent : colors.textMuted} />
                <AppText variant="caption" color={colors.textMuted}>
                  {likeCount}
                </AppText>
              </Row>
            </Pressable>
            <Row gap={4}>
              <Icon name="chatbubble-outline" color={colors.textMuted} />
              <AppText variant="caption" color={colors.textMuted}>
                {post.comments.length}
              </AppText>
            </Row>
          </Row>
          <Pressable
            onPress={reportPost}
            accessibilityRole="button"
            accessibilityLabel="Denunciar publicação"
            hitSlop={10}>
            <Icon name="flag-outline" size={20} color={colors.textSubtle} />
          </Pressable>
        </Row>
      ) : null}
    </Card>
  );
}
