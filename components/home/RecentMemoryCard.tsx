import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { FunctionReturnType } from 'convex/server';
import type { api } from '../../convex/_generated/api';
import { MEETING_TYPE_OPTIONS } from '../../lib/recordingSummary';
import { colors, fonts, radius, shadow, spacing } from '../../theme/tokens';

export type LatestRecording = FunctionReturnType<typeof api.recordings.getLatestRecording>;

interface Props {
  /** `undefined` while loading, `null` when the user has no recordings. */
  recording: LatestRecording | undefined;
  onOpen: (recordingId: string) => void;
  onRecord: () => void;
  onMore: () => void;
}

function formatMinutes(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function formatRecordedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

function meetingLabel(meetingType: string | undefined): string {
  return MEETING_TYPE_OPTIONS.find((option) => option.id === meetingType)?.label ?? 'Culto';
}

/** Most recent recording with its AI key points; loading and empty states included. */
export function RecentMemoryCard({ recording, onOpen, onRecord, onMore }: Props) {
  if (recording === undefined) {
    return (
      <View style={[styles.card, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (recording === null) {
    return (
      <View style={[styles.card, styles.center, styles.emptyGap]}>
        <MaterialCommunityIcons name="microphone-outline" size={32} color={colors.outline} />
        <Text style={styles.emptyText}>Nenhuma gravação ainda. Grave seu primeiro culto!</Text>
        <Pressable
          onPress={onRecord}
          accessibilityRole="button"
          accessibilityLabel="Gravar culto"
          style={({ pressed }) => [styles.recordButton, pressed && { opacity: 0.85 }]}
        >
          <MaterialCommunityIcons name="microphone" size={18} color={colors.onPrimary} />
          <Text style={styles.recordButtonText}>Gravar culto</Text>
        </Pressable>
      </View>
    );
  }

  const completed = recording.status === 'completed';
  const failed = recording.status === 'failed';

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => onOpen(recording._id)}
        accessibilityRole="button"
        accessibilityLabel={recording.title ?? 'Abrir gravação'}
        style={styles.body}
      >
        <Text style={styles.metaTop} numberOfLines={1}>
          {recording.preacher ?? recording.church ?? 'Pregador não informado'}
          {'  •  '}
          {formatMinutes(recording.durationSeconds)}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {recording.title ?? 'Gravação em processamento'}
        </Text>
        <Text style={styles.metaBottom} numberOfLines={1}>
          {meetingLabel(recording.meetingType)}
          {'  •  '}Gravado em {formatRecordedAt(recording.createdAt)}
        </Text>
      </Pressable>

      <View style={styles.summaryBox}>
        {completed && recording.keyPoints.length > 0 ? (
          <>
            <View style={styles.summaryHeader}>
              <MaterialCommunityIcons name="creation" size={14} color={colors.primary} />
              <Text style={styles.summaryTitle}>3 Pontos-Chave Gerados pela IA:</Text>
            </View>
            {recording.keyPoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.statusText}>
            {failed ? 'Não foi possível gerar o resumo desta gravação.' : 'A IA está preparando o resumo da sua gravação…'}
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => onOpen(recording._id)}
          accessibilityRole="link"
          style={styles.link}
        >
          <MaterialCommunityIcons name="book-open-page-variant-outline" size={16} color={colors.secondary} />
          <Text style={styles.linkText}>{completed ? 'Ler transcrição completa' : 'Ver gravação'}</Text>
        </Pressable>
        <Pressable
          onPress={onMore}
          accessibilityRole="button"
          accessibilityLabel="Mais opções"
          style={styles.moreButton}
        >
          <MaterialCommunityIcons name="dots-horizontal" size={18} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  emptyGap: { gap: spacing.md },
  emptyText: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: colors.onSurfaceVariant, textAlign: 'center' },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
  },
  recordButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.onPrimary },
  body: { gap: 4 },
  metaTop: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.outline },
  title: { fontFamily: fonts.bodyBold, fontSize: 20, lineHeight: 26, color: colors.onSurface },
  metaBottom: { fontFamily: fonts.body, fontSize: 12, color: colors.onSurfaceVariant },
  summaryBox: { backgroundColor: '#FFF0EA', borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.onSurface },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 },
  bulletText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.onSurfaceVariant },
  statusText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.onSurfaceVariant },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  linkText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.secondary },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
});
