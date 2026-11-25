import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../convex/_generated/api';
import { DailyQuoteCard } from '../../components/home/DailyQuoteCard';
import { HomeHeader } from '../../components/home/HomeHeader';
import { QuickAccessGrid } from '../../components/home/QuickAccessGrid';
import { RecentMemoryCard } from '../../components/home/RecentMemoryCard';
import { WidgetBanner, type WidgetStatus } from '../../components/home/WidgetBanner';
import { useBible } from '../../hooks/useBible';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useToast } from '../../hooks/useToast';
import { useVerseMark } from '../../hooks/useVerseMark';
import { useWidgetSettings } from '../../hooks/useWidgetSettings';
import { getDailyVerse } from '../../lib/dailyVerse';
import { colors, fonts, spacing } from '../../theme/tokens';
import { AppPressable } from '../../components/ui/AppPressable';

/** Home dashboard: daily verse, quick access, latest recording and widget banner. */
export default function HomeScreen() {
  const { anonymousId, reset } = useOnboarding();
  const { versionCode } = useBible();
  const toast = useToast();
  const { t } = useTranslation();

  const user = useQuery(api.users.getUserByAnonymousId, anonymousId ? { anonymousId } : 'skip');
  const latestRecording = useQuery(api.recordings.getLatestRecording, anonymousId ? { anonymousId } : 'skip');
  // Live: the badge updates as soon as someone likes or comments on one of the user's posts.
  const unreadNotifications = useQuery(api.notifications.getUnreadCount, anonymousId ? { anonymousId } : 'skip') ?? 0;

  const { settings: widgetSettings, placed: widgetPlaced } = useWidgetSettings();
  const widgetStatus: WidgetStatus = !widgetSettings.enabled ? 'paused' : widgetPlaced === false ? 'not_added' : 'active';

  const dailyVerse = useMemo(() => getDailyVerse(versionCode), [versionCode]);
  const [favorite, toggleFavorite] = useVerseMark('favorites', dailyVerse?.key);
  const [bookmarked, toggleBookmark] = useVerseMark('bookmarks', dailyVerse?.key);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HomeHeader
          name={user?.name ?? null}
          unreadCount={unreadNotifications}
          onPressBell={() => router.push('/notifications')}
          imageUrl={user?.profileImageUrl ?? null}
          onPressAvatar={() => router.push('/profile/edit')}
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
            <Text style={styles.sectionTitle}>{t('home.quickAccess.title')}</Text>
            <Text style={styles.sectionHint}>{t('home.quickAccess.hint')}</Text>
          </View>
          <QuickAccessGrid
            onOpenBible={() => router.push('/bible')}
            onOpenRecording={() => router.push('/recording')}
            onOpenDiary={() => router.push('/diary')}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.recent.title')}</Text>
            <AppPressable onPress={() => router.push('/diary')} accessibilityRole="link" accessibilityLabel={t('home.recent.seeAll')}>
              <Text style={styles.sectionLink}>{t('home.recent.seeAll')}</Text>
            </AppPressable>
          </View>
          <RecentMemoryCard
            recording={latestRecording}
            onOpen={(id) => router.push({ pathname: '/diary/[id]', params: { id } })}
            onRecord={() => router.push('/recording')}
            onMore={() => toast(t('common.comingSoon'))}
          />
        </View>

        <WidgetBanner status={widgetStatus} onAdjust={() => router.push('/widget/settings')} />
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
