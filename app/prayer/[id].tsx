import { useRef } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
import { colors, fonts, spacing } from '../../theme/tokens';
import { AppPressable } from '../../components/ui/AppPressable';

const PAGE_SIZE = 20;

/** Keeps the readable part of a Convex server error. */
const errorMessage = (error: unknown, fallback: string): string => {
  const text = error instanceof Error ? error.message : '';
  return text.match(/Uncaught Error: (.+?)(?: at |$|\n)/)?.[1] ?? fallback;
};

/** A post with its comments, and a composer to write a new one. */
export default function PrayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const prayerId = id as Id<'prayers'>;
  const { anonymousId } = useOnboarding();
  const toast = useToast();
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
      toast(errorMessage(error, 'Não foi possível comentar.'));
      throw error;
    }
  };

  const header = prayer ? (
    <View style={styles.headerBlock}>
      <PrayerCard
        prayer={prayer}
        onToggleAmen={(id) => anonymousId && toggleAmen({ anonymousId, prayerId: id }).catch((error) => toast(errorMessage(error, 'Não foi possível curtir.')))}
        onReport={(id) =>
          anonymousId &&
          reportPrayer({ anonymousId, prayerId: id }).then(
            () => toast('Obrigado. Vamos analisar esta publicação.'),
            (error) => Alert.alert('Não foi possível denunciar', errorMessage(error, 'Tente novamente.')),
          )
        }
        onDelete={(id) =>
          anonymousId &&
          deletePrayer({ anonymousId, prayerId: id }).then(
            () => {
              toast('Publicação excluída');
              goBack();
            },
            (error) => Alert.alert('Não foi possível excluir', errorMessage(error, 'Tente novamente.')),
          )
        }
      />
      <Text style={styles.commentsTitle}>Comentários {prayer.commentCount > 0 ? `(${prayer.commentCount})` : ''}</Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <AppPressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.topButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onSurface} />
        </AppPressable>
        <Text style={styles.topTitle}>Publicação</Text>
        <View style={styles.topButton} />
      </View>

      {prayer === undefined ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : prayer === null ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="text-box-remove-outline" size={36} color={colors.outline} />
          <Text style={styles.emptyTitle}>Publicação indisponível</Text>
          <Text style={styles.emptyBody}>Ela pode ter sido excluída ou ocultada.</Text>
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
                  deleteComment({ anonymousId, commentId }).catch((error) => Alert.alert('Não foi possível excluir', errorMessage(error, 'Tente novamente.')))
                }
                onReport={(commentId) =>
                  anonymousId &&
                  reportComment({ anonymousId, commentId }).then(
                    () => toast('Obrigado. Vamos analisar este comentário.'),
                    (error) => Alert.alert('Não foi possível denunciar', errorMessage(error, 'Tente novamente.')),
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
                  <Text style={styles.emptyBody}>Seja o primeiro a comentar e encorajar com uma palavra.</Text>
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
