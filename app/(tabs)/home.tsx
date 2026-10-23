import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from 'convex/react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../convex/_generated/api';
import { DailyQuoteCard } from '../../components/home/DailyQuoteCard';
import { HomeHeader } from '../../components/home/HomeHeader';
import { QuickAccessGrid } from '../../components/home/QuickAccessGrid';
import { RecentMemoryCard } from '../../components/home/RecentMemoryCard';
import { WidgetBanner } from '../../components/home/WidgetBanner';
import { useBible } from '../../hooks/useBible';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useToast } from '../../hooks/useToast';
import { useVerseMark } from '../../hooks/useVerseMark';
import { getDailyVerse } from '../../lib/dailyVerse';
import { colors, fonts, spacing } from '../../theme/tokens';

// TODO(notifications): replace with real unread state once a notification system exists.
const HAS_UNREAD_NOTIFICATIONS = true;

/** Home dashboard: daily verse, quick access, latest recording and widget banner. */
export default function HomeScreen() {
  const { anonymousId, reset } = useOnboarding();
  const { versionCode } = useBible();
  const toast = useToast();

  const user = useQuery(api.users.getUserByAnonymousId, anonymousId ? { anonymousId } : 'skip');
  const latestRecording = useQuery(api.recordings.getLatestRecording, anonymousId ? { anonymousId } : 'skip');

  const dailyVerse = useMemo(() => getDailyVerse(versionCode), [versionCode]);
  const [favorite, toggleFavorite] = useVerseMark('favorites', dailyVerse?.key);
  const [bookmarked, toggleBookmark] = useVerseMark('bookmarks', dailyVerse?.key);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HomeHeader
          name={user?.name ?? null}
          hasUnreadNotifications={HAS_UNREAD_NOTIFICATIONS}
          onPressBell={() => toast('Em breve')}
          onPressAvatar={() => toast('Em breve')}
          // Dev-only shortcut to redo onboarding (replaces the old temporary button).
          onLongPressAvatar={__DEV__ ? () => void reset() : undefined}
        />

        {dailyVerse ? (
          <DailyQuoteCard
            quote={dailyVerse.text}
            reference={dailyVerse.reference}
            favorite={favorite}
            bookmarked={bookmarked}
            onToggleFavorite={toggleFavorite}
            onToggleBookmark={toggleBookmark}
          />
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Acesso Rápido</Text>
            <Text style={styles.sectionHint}>3 atalhos</Text>
          </View>
          <QuickAccessGrid
            onOpenBible={() => router.push('/bible')}
            onOpenRecording={() => router.push('/recording')}
            onOpenDiary={() => router.push('/diary')}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Últimas Memórias</Text>
            <Pressable onPress={() => router.push('/diary')} accessibilityRole="link" accessibilityLabel="Ver tudo">
              <Text style={styles.sectionLink}>Ver tudo</Text>
            </Pressable>
          </View>
          <RecentMemoryCard
            recording={latestRecording}
            onOpen={(id) => router.push({ pathname: '/diary/[id]', params: { id } })}
            onRecord={() => router.push('/recording')}
            onMore={() => toast('Em breve')}
          />
        </View>

        <WidgetBanner onAdjust={() => Alert.alert('Em breve', 'O widget na tela inicial estará disponível em breve.')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  // Bottom padding keeps the last card clear of the tab bar and the floating mic button.
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 150, gap: spacing.xxl },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.onSurface },
  sectionHint: { fontFamily: fonts.body, fontSize: 12, color: colors.outline },
  sectionLink: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primary },
});
