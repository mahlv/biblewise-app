import { useRef } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { CommentComposer } from '../../components/CommentComposer';
import { CommentItem, type CommentView } from '../../components/CommentItem';
import { PrayerCard } from '../../components/PrayerCard';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useToast } from '../../hooks/useToast';
import { haptics } from '../../lib/haptics';
import { serverErrorMessage as errorMessage } from '../../lib/serverError';
import { colors, fonts, spacing } from '../../theme/tokens';
import { AppPressable } from '../../components/ui/AppPressable';

const PAGE_SIZE = 20;

/** A post with its comments, and a composer to write a new one. */
export default function PrayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const prayerId = id as Id<'prayers'>;
  const { anonymousId } = useOnboarding();
  const toast = useToast();
  const { t } = useTranslation();
  const listRef = useRef<FlatList<CommentView>>(null);

  const viewerId = anonymousId ?? undefined;
  const prayer = useQuery(api.prayers.getPrayer, anonymousId ? { anonymousId: viewerId, prayerId } : 'skip');
  const { results, status, loadMore } = usePaginatedQuery(
    api.comments.listComments,
    anonymousId && prayer ? { anonymousId: viewerId, prayerId } : 'skip',
    { initialNumItems: PAGE_SIZE },
  );

  const toggleAmen = useMutation(api.prayers.toggleAmen).withOptimisticUpdate((localStore, args) => {
    const key = { anonymousId: viewerId, prayerId: args.prayerId };
    const current = localStore.getQuery(api.prayers.getPrayer, key);
    if (current) {
      localStore.setQuery(api.prayers.getPrayer, key, {
        ...current,
        amenedByMe: !current.amenedByMe,
        amenCount: Math.max(0, current.amenCount + (current.amenedByMe ? -1 : 1)),
      });
    }
  });
  const reportPrayer = useMutation(api.prayers.reportPrayer);
  const deletePrayer = useMutation(api.prayers.deletePrayer);
  const createComment = useMutation(api.comments.createComment);
  const deleteComment = useMutation(api.comments.deleteComment);
  const reportComment = useMutation(api.comments.reportComment);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/diary'));

  const sendComment = async (content: string) => {
    if (!anonymousId) return;
    try {
      await createComment({ anonymousId, prayerId, content });
      haptics.success();
      // Wait for the new row to render, then bring the latest comment into view.
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 350);
    } catch (error) {
      haptics.error();
      toast(errorMessage(error, t('prayer.comment.failed')));
      throw error;
    }
  };

  const header = prayer ? (
    <View style={styles.headerBlock}>
      <PrayerCard
        prayer={prayer}
        onToggleAmen={(id) => anonymousId && toggleAmen({ anonymousId, prayerId: id }).catch((error) => toast(errorMessage(error, t('prayer.feed.likeFailed'))))}
        onReport={(id) =>
          anonymousId &&
          reportPrayer({ anonymousId, prayerId: id }).then(
            () => toast(t('prayer.feed.reportThanks')),
            (error) => Alert.alert(t('prayer.feed.reportFailed'), errorMessage(error, t('common.tryAgain'))),
          )
        }
        onDelete={(id) =>
          anonymousId &&
          deletePrayer({ anonymousId, prayerId: id }).then(
            () => {
              toast(t('prayer.feed.deleted'));
              goBack();
            },
            (error) => Alert.alert(t('prayer.feed.deleteFailed'), errorMessage(error, t('common.tryAgain'))),
          )
        }
      />
      <Text style={styles.commentsTitle}>
        {t('prayer.detail.comments')} {prayer.commentCount > 0 ? `(${prayer.commentCount})` : ''}
      </Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <AppPressable onPress={goBack} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.topButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onSurface} />
        </AppPressable>
        <Text style={styles.topTitle}>{t('prayer.card.post')}</Text>
        <View style={styles.topButton} />
      </View>

      {prayer === undefined ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : prayer === null ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="text-box-remove-outline" size={36} color={colors.outline} />
          <Text style={styles.emptyTitle}>{t('prayer.detail.unavailable')}</Text>
          <Text style={styles.emptyBody}>{t('prayer.detail.unavailableBody')}</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <FlatList
            ref={listRef}
            data={results}
            keyExtractor={(item) => item._id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListHeaderComponent={header}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            renderItem={({ item }) => (
              <CommentItem
                comment={item}
                viewerIsPostAuthor={prayer.isMine}
                onDelete={(commentId) =>
                  anonymousId &&
                  deleteComment({ anonymousId, commentId }).catch((error) =>
                    Alert.alert(t('prayer.feed.deleteFailed'), errorMessage(error, t('common.tryAgain'))),
                  )
                }
                onReport={(commentId) =>
                  anonymousId &&
                  reportComment({ anonymousId, commentId }).then(
                    () => toast(t('prayer.comment.reportThanks')),
                    (error) => Alert.alert(t('prayer.feed.reportFailed'), errorMessage(error, t('common.tryAgain'))),
                  )
                }
              />
            )}
            onEndReachedThreshold={0.5}
            onEndReached={() => {
              if (status === 'CanLoadMore') loadMore(PAGE_SIZE);
            }}
            ListEmptyComponent={
              status === 'LoadingFirstPage' ? (
                <ActivityIndicator color={colors.primary} style={styles.loading} />
              ) : (
                <View style={styles.noComments}>
                  <MaterialCommunityIcons name="comment-text-outline" size={28} color={colors.outline} />
                  <Text style={styles.emptyBody}>{t('prayer.detail.noComments')}</Text>
                </View>
              )
            }
            ListFooterComponent={status === 'LoadingMore' ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : null}
          />
          <CommentComposer onSubmit={sendComment} />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  topButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: fonts.titleSemiBold, fontSize: 22, color: colors.onSurface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  headerBlock: { gap: spacing.lg, marginBottom: spacing.lg },
  commentsTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onSurface },
  loading: { paddingVertical: spacing.lg },
  noComments: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, paddingHorizontal: spacing.xl },
  emptyTitle: { fontFamily: fonts.titleSemiBold, fontSize: 20, color: colors.onSurface, textAlign: 'center' },
  emptyBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.onSurfaceVariant, textAlign: 'center' },
});
