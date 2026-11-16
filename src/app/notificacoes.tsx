import { View } from 'react-native';

import { AppText, Card, Icon, Row, Screen } from '@/components/ui/primitives';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useAsync } from '@/hooks/use-async';
import { formatRelative } from '@/lib/format';
import { services } from '@/services';
import { colors, spacing } from '@/theme/tokens';

export default function NotificationsScreen() {
  const list = useAsync(() => services.catalog.listNotifications(), []);

  return (
    <Screen hasHeader>
      {list.status === 'loading' ? <LoadingState /> : null}
      {list.status === 'error' ? <ErrorState message={list.error.message} onRetry={list.reload} /> : null}
      {list.status === 'success' && list.data.length === 0 ? (
        <EmptyState icon="notifications-off-outline" title="Sem notificações" />
      ) : null}
      {list.status === 'success'
        ? list.data.map((n) => (
            <Card key={n.id} tone={n.read ? 'surface' : 'accent'}>
              <Row gap={spacing.md} style={{ alignItems: 'flex-start' }}>
                <Icon name={n.read ? 'notifications-outline' : 'notifications'} color={colors.accent} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyStrong" color={colors.textTitle}>
                    {n.title}
                  </AppText>
                  <AppText>{n.body}</AppText>
                  <AppText variant="small" color={colors.textSubtle}>
                    {formatRelative(n.createdAt)}
                  </AppText>
                </View>
              </Row>
            </Card>
          ))
        : null}
    </Screen>
  );
}
