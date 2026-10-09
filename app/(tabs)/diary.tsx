import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from 'convex/react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../convex/_generated/api';
import { useOnboarding } from '../../hooks/useOnboarding';
import { formatDuration, statusLabel, type RecordingStatus } from '../../lib/recordingSummary';
import { colors, fonts, radius, shadow, spacing } from '../../theme/tokens';

/** Fixed pseudo-random heights so each card shows the same mini waveform. */
const MINI_BARS = [10, 18, 12, 24, 16, 28, 14, 22, 10, 20, 26, 12, 18, 8];

const BADGE_COLORS: Record<RecordingStatus, { background: string; text: string }> = {
  uploading: { background: '#FFE9E4', text: colors.primary },
  transcribing: { background: '#FFE9E4', text: colors.primary },
  summarizing: { background: '#DDE8FF', text: colors.secondary },
  completed: { background: '#DDF3D6', text: colors.tertiary },
  failed: { background: '#FFD9DF', text: colors.primary },
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Diary tab: the user's recorded messages with their AI summaries. */
export default function DiaryScreen() {
  const { anonymousId } = useOnboarding();
  const recordings = useQuery(api.recordings.listUserRecordings, anonymousId ? { anonymousId } : 'skip');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Meu Diário</Text>
        <Text style={styles.subtitle}>Suas mensagens gravadas, resumidas e organizadas.</Text>
      </View>

      {recordings === undefined ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="microphone-outline" size={36} color={colors.outline} />
              <Text style={styles.emptyTitle}>Nenhuma gravação ainda</Text>
              <Text style={styles.emptyBody}>Toque no microfone para gravar uma mensagem. O resumo aparecerá aqui.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const badge = BADGE_COLORS[item.status];
            return (
              <Pressable
                onPress={() => router.push({ pathname: '/diary/[id]', params: { id: item._id } })}
                accessibilityRole="button"
                accessibilityLabel={item.title ?? 'Gravação sem título'}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.badge, { backgroundColor: badge.background }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{statusLabel(item.status)}</Text>
                  </View>
                  <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title ?? 'Gravação em processamento'}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {[item.preacher, item.church].filter(Boolean).join(' · ') || 'Pregador não informado'}
                </Text>
                <View style={styles.cardBottom}>
                  <View style={styles.mini}>
                    {MINI_BARS.map((height, index) => (
                      <View key={index} style={[styles.miniBar, { height }]} />
                    ))}
                  </View>
                  <Text style={styles.duration}>{formatDuration(item.durationSeconds)}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: 2 },
  title: { fontFamily: fonts.titleSemiBold, fontSize: 30, color: colors.onSurface },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.onSurfaceVariant },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Bottom padding keeps the last card clear of the tab bar and the mic button.
  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 150, gap: spacing.md },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: { fontFamily: fonts.titleSemiBold, fontSize: 20, color: colors.onSurface },
  emptyBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.onSurfaceVariant, textAlign: 'center' },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, ...shadow },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
  date: { fontFamily: fonts.body, fontSize: 11, color: colors.outline },
  cardTitle: { fontFamily: fonts.titleSemiBold, fontSize: 20, lineHeight: 25, color: colors.onSurface },
  cardMeta: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.onSurfaceVariant },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 30 },
  miniBar: { width: 3, borderRadius: 2, backgroundColor: '#F2A5B8' },
  duration: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.onSurface },
});
