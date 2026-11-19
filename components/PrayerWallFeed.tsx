import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { optimisticallyUpdateValueInPaginatedQuery, useMutation, usePaginatedQuery } from 'convex/react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../convex/_generated/api';
import { PrayerCard, type PrayerView } from './PrayerCard';
import { useToast } from '../hooks/useToast';
import { colors, fonts, radius, shadow, spacing } from '../theme/tokens';

type Filter = 'all' | 'mine' | 'testimony';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

interface Props {
  anonymousId: string | null;
  /** Diary header (title, stats, tab switcher), rendered as part of the list header. */
  header: ReactElement;
  /** Number shown on the "Meus Pedidos" chip (the user's own posts). */
  myPostsCount?: number;
}

const errorMessage = (error: unknown, fallback: string): string => {
  // Convex wraps server errors; keep the readable part of our own messages.
  const text = error instanceof Error ? error.message : '';
  const match = text.match(/Uncaught Error: (.+?)(?: at |$|\n)/);
  return match?.[1] ?? fallback;
};

/** "Mural de Oração / Testemunho": CTA, search, filter chips and the paginated feed. */
export function PrayerWallFeed({ anonymousId, header, myPostsCount }: Props) {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [searchText, setSearchText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchText.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Exactly the args of the query: the optimistic update below must target the same one.
  const queryArgs = useMemo(
    () => ({
      anonymousId: anonymousId ?? undefined,
      type: filter === 'testimony' ? ('testimony' as const) : ('all' as const),
      mine: filter === 'mine' ? true : undefined,
      searchTerm: searchTerm || undefined,
    }),
    [anonymousId, filter, searchTerm],
  );
  const { results, status, loadMore } = usePaginatedQuery(api.prayers.listPrayers, anonymousId ? queryArgs : 'skip', {
    initialNumItems: PAGE_SIZE,
  });

  const toggleAmen = useMutation(api.prayers.toggleAmen).withOptimisticUpdate((localStore, args) => {
    optimisticallyUpdateValueInPaginatedQuery(localStore, api.prayers.listPrayers, queryArgs, (prayer) =>
      prayer._id === args.prayerId
        ? { ...prayer, amenedByMe: !prayer.amenedByMe, amenCount: Math.max(0, prayer.amenCount + (prayer.amenedByMe ? -1 : 1)) }
        : prayer,
    );
  });
  const reportPrayer = useMutation(api.prayers.reportPrayer);
  const deletePrayer = useMutation(api.prayers.deletePrayer);

  const handleToggleAmen = (prayerId: PrayerView['_id']) => {
    if (!anonymousId) return;
    toggleAmen({ anonymousId, prayerId }).catch((error) => toast(errorMessage(error, 'Não foi possível registrar o Amém.')));
  };

  const handleReport = (prayerId: PrayerView['_id']) => {
    if (!anonymousId) return;
    reportPrayer({ anonymousId, prayerId }).then(
      () => toast('Obrigado. Vamos analisar esta publicação.'),
      (error) => Alert.alert('Não foi possível denunciar', errorMessage(error, 'Tente novamente.')),
    );
  };

  const handleDelete = (prayerId: PrayerView['_id']) => {
    if (!anonymousId) return;
    deletePrayer({ anonymousId, prayerId }).then(
      () => toast('Publicação excluída'),
      (error) => Alert.alert('Não foi possível excluir', errorMessage(error, 'Tente novamente.')),
    );
  };

  const chips: { id: Filter; label: string; count?: number; dot?: boolean }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'mine', label: 'Meus Pedidos', count: myPostsCount },
    { id: 'testimony', label: 'Testemunhos', dot: true },
  ];

  const listHeader = (
    <View style={styles.headerWrapper}>
      {header}

      <View style={styles.ctaCard}>
        <Pressable
          onPress={() => router.push('/prayer/create')}
          accessibilityRole="button"
          accessibilityLabel="Nova Oração ou Testemunho"
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
        >
          <MaterialCommunityIcons name="plus" size={20} color={colors.onPrimary} />
          <Text style={styles.ctaText}>Nova Oração ou Testemunho</Text>
        </Pressable>
      </View>

      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.outline} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar pedido, oração ou autor..."
          placeholderTextColor={colors.outline}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Buscar pedido, oração ou autor"
          style={styles.searchInput}
        />
        {searchText ? (
          <Pressable onPress={() => setSearchText('')} accessibilityRole="button" accessibilityLabel="Limpar busca" hitSlop={8}>
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.outline} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        {chips.map((chip) => {
          const selected = chip.id === filter;
          return (
            <Pressable
              key={chip.id}
              onPress={() => setFilter(chip.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              {chip.dot ? <View style={[styles.chipDot, selected && { backgroundColor: colors.onPrimary }]} /> : null}
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{chip.label}</Text>
              {chip.count !== undefined ? (
                <View style={[styles.chipCount, selected && styles.chipCountSelected]}>
                  <Text style={[styles.chipCountText, selected && styles.chipTextSelected]}>{chip.count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const loadingFirst = status === 'LoadingFirstPage' || !anonymousId;

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={listHeader}
      renderItem={({ item }) => (
        <PrayerCard
          prayer={item}
          onToggleAmen={handleToggleAmen}
          onReport={handleReport}
          onDelete={handleDelete}
          onOpen={(id) => router.push({ pathname: '/prayer/[id]', params: { id } })}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
      onEndReachedThreshold={0.6}
      onEndReached={() => {
        if (status === 'CanLoadMore') loadMore(PAGE_SIZE);
      }}
      ListEmptyComponent={
        loadingFirst ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="hands-pray" size={36} color={colors.outline} />
            <Text style={styles.emptyTitle}>
              {filter === 'mine' && !searchTerm ? 'Você ainda não publicou nada' : 'Nenhuma oração encontrada'}
            </Text>
            <Text style={styles.emptyBody}>
              {searchTerm
                ? 'Tente outras palavras na busca.'
                : filter === 'mine'
                  ? 'Compartilhe um pedido de oração ou um testemunho com a comunidade.'
                  : 'Seja o primeiro a compartilhar um pedido ou testemunho.'}
            </Text>
          </View>
        )
      }
      ListFooterComponent={status === 'LoadingMore' ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : null}
    />
  );
}

const styles = StyleSheet.create({
  // Bottom padding keeps the last card clear of the tab bar and the mic button.
  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 150 },
  headerWrapper: { gap: spacing.lg, marginBottom: spacing.lg },
  ctaCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.md, alignItems: 'center' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
    width: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    ...shadow,
    shadowOpacity: 0.25,
  },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.lg,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.onSurface, paddingVertical: 0 },
  chips: { gap: spacing.sm, paddingRight: spacing.xl },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.lg,
  },
  chipSelected: { backgroundColor: colors.onSurface, borderColor: colors.onSurface },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.onSurfaceVariant },
  chipTextSelected: { color: colors.onPrimary },
  chipDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.tertiary },
  chipCount: { minWidth: 22, alignItems: 'center', borderRadius: radius.pill, backgroundColor: colors.surfaceContainer, paddingHorizontal: 6, paddingVertical: 1 },
  chipCountSelected: { backgroundColor: 'rgba(255,255,255,0.2)' },
  chipCountText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.onSurfaceVariant },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: 30, paddingHorizontal: spacing.xl },
  emptyTitle: { fontFamily: fonts.titleSemiBold, fontSize: 20, color: colors.onSurface, textAlign: 'center' },
  emptyBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.onSurfaceVariant, textAlign: 'center' },
  footer: { paddingVertical: spacing.lg },
});
