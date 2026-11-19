import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../convex/_generated/api';
import { useOnboarding } from '../hooks/useOnboarding';
import { notificationMessage } from '../lib/notificationText';
import { formatTimeAgo } from '../lib/timeAgo';
import { colors, fonts, radius, shadow, spacing } from '../theme/tokens';

type NotificationView = FunctionReturnType<typeof api.notifications.listNotifications>['page'][number];

const PAGE_SIZE = 20;

/** Notification center behind the bell: likes and comments on the user's posts. */
export default function NotificationsScreen() {
  const { anonymousId } = useOnboarding();
  const { results, status, loadMore } = usePaginatedQuery(api.notifications.listNotifications, anonymousId ? { anonymousId } : 'skip', {
    initialNumItems: PAGE_SIZE,
  });
  const unreadCount = useQuery(api.notifications.getUnreadCount, anonymousId ? { anonymousId } : 'skip') ?? 0;
  const markRead = useMutation(api.notifications.markNotificationRead);
  const markAllRead = useMutation(api.notifications.markAllNotificationsRead);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  const open = (notification: NotificationView) => {
    if (anonymousId && !notification.isRead) markRead({ anonymousId, notificationId: notification._id }).catch(() => undefined);
    router.push({ pathname: '/prayer/[id]', params: { id: notification.prayerId } });
  };

  const loadingFirst = status === 'LoadingFirstPage' || !anonymousId;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.headerButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Notificações</Text>
        <Pressable
          onPress={() => anonymousId && markAllRead({ anonymousId }).catch(() => undefined)}
          disabled={unreadCount === 0}
          accessibilityRole="button"
          accessibilityLabel="Marcar todas como lidas"
          style={styles.headerButton}
        >
          <MaterialCommunityIcons name="check-all" size={24} color={unreadCount === 0 ? colors.outlineVariant : colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (status === 'CanLoadMore') loadMore(PAGE_SIZE);
        }}
        ListEmptyComponent={
          loadingFirst ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="bell-outline" size={36} color={colors.outline} />
              <Text style={styles.emptyTitle}>Nenhuma notificação ainda</Text>
              <Text style={styles.emptyBody}>Quando alguém curtir ou comentar nas suas publicações do mural, você verá aqui.</Text>
            </View>
          )
        }
        ListFooterComponent={status === 'LoadingMore' ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : null}
        renderItem={({ item }) => {
          const message = notificationMessage(item);
          const like = item.type === 'like';
          return (
            <Pressable
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityLabel={`${message.headline}. ${item.isRead ? '' : 'Não lida.'}`}
              style={({ pressed }) => [styles.row, !item.isRead && styles.rowUnread, pressed && { opacity: 0.9 }]}
            >
              <View style={[styles.icon, { backgroundColor: like ? colors.selectedIconContainer : '#DDE8FF' }]}>
                <MaterialCommunityIcons name={like ? 'heart' : 'comment-text'} size={20} color={like ? colors.primary : colors.secondary} />
              </View>
              <View style={styles.texts}>
                <Text style={styles.headline}>{message.headline}</Text>
                <Text style={styles.detail} numberOfLines={2}>
                  {message.detail}
                </Text>
                <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
              </View>
              {!item.isRead ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.titleSemiBold, fontSize: 22, color: colors.onSurface },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxxl, flexGrow: 1 },
  loading: { paddingVertical: spacing.xl },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: { fontFamily: fonts.titleSemiBold, fontSize: 20, color: colors.onSurface },
  emptyBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.onSurfaceVariant, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, padding: spacing.lg, ...shadow },
  rowUnread: { backgroundColor: colors.selectedContainer },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  headline: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onSurface },
  detail: { fontFamily: fonts.verseItalic, fontSize: 15, lineHeight: 20, color: colors.onSurfaceVariant },
  time: { fontFamily: fonts.body, fontSize: 11, color: colors.outline, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
});
