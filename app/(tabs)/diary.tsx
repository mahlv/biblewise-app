import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../convex/_generated/api';
import { DiaryStats, type DiaryView } from '../../components/diary/DiaryStats';
import { DiaryTabSwitcher } from '../../components/diary/DiaryTabSwitcher';
import { RecordingsList } from '../../components/diary/RecordingsList';
import { PrayerWallFeed } from '../../components/PrayerWallFeed';
import { useOnboarding } from '../../hooks/useOnboarding';
import { colors, fonts, spacing } from '../../theme/tokens';

/** Diary tab: the user's recordings, or the community prayer wall. */
export default function DiaryScreen() {
  const { anonymousId } = useOnboarding();
  const { t } = useTranslation();
  const [view, setView] = useState<DiaryView>('wall');
  const stats = useQuery(api.prayers.getUserStats, anonymousId ? { anonymousId } : 'skip');

  // Shared by both lists as their header, so only one virtualized list is ever on screen.
  const header = (
    <View style={styles.header}>
      <View style={styles.titles}>
        <Text style={styles.eyebrow}>{t('diary.eyebrow')}</Text>
        <Text style={styles.title}>{t('home.quickAccess.diaryTitle')}</Text>
      </View>
      <DiaryStats stats={stats} view={view} />
      <DiaryTabSwitcher view={view} onChange={setView} />
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {view === 'recordings' ? (
        <RecordingsList header={header} />
      ) : (
        <PrayerWallFeed anonymousId={anonymousId} header={header} myPostsCount={stats ? stats.prayers + stats.testimonies : undefined} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { gap: spacing.lg },
  titles: { gap: 2 },
  eyebrow: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 1.2, color: colors.primary },
  title: { fontFamily: fonts.titleSemiBold, fontSize: 32, color: colors.onSurface },
});
