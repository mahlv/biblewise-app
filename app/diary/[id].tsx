import { ActivityIndicator, Alert, useWindowDimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useMutation, useQuery } from 'convex/react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { ProgressBar } from '../../components/ProgressBar';
import { QuoteCard } from '../../components/QuoteCard';
import { QuoteShareSheet } from '../../components/QuoteShareSheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { DEFAULT_QUOTE_STYLE, formatQuoteDate, type QuoteStyle } from '../../lib/quoteStyle';
import { readQuoteStyle, saveQuoteStyle } from '../../lib/quoteStylePreferences';
import { useOnboarding } from '../../hooks/useOnboarding';
import { MEETING_TYPE_OPTIONS, formatClock, statusLabel } from '../../lib/recordingSummary';
import { colors, fonts, radius, shadow, spacing } from '../../theme/tokens';

/** Read-only detail of a recording: summary, scriptures, quote and audio player. */
export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { anonymousId } = useOnboarding();
  const recordingId = id as Id<'recordings'>;
  const recording = useQuery(api.recordings.getRecording, anonymousId ? { anonymousId, recordingId } : 'skip');
  const deleteRecording = useMutation(api.recordings.deleteRecording);

  const player = useAudioPlayer(recording?.audioUrl ? { uri: recording.audioUrl } : null);
  const playerStatus = useAudioPlayerStatus(player);

  const { width: screenWidth } = useWindowDimensions();
  const [quoteStyle, setQuoteStyle] = useState<QuoteStyle>(DEFAULT_QUOTE_STYLE);
  const [quoteSheetOpen, setQuoteSheetOpen] = useState(false);

  useEffect(() => {
    readQuoteStyle().then(setQuoteStyle);
  }, []);

  const changeQuoteStyle = (next: QuoteStyle) => {
    setQuoteStyle(next);
    void saveQuoteStyle(next);
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/diary'));

  const confirmDelete = () => {
    if (!anonymousId) return;
    Alert.alert('Excluir gravação?', 'O áudio e o resumo serão apagados definitivamente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          player.pause();
          await deleteRecording({ anonymousId, recordingId }).catch(() => undefined);
          goBack();
        },
      },
    ]);
  };

  const togglePlay = () => (playerStatus.playing ? player.pause() : player.play());

  const header = (
    <View style={styles.topBar}>
      <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.roundButton}>
        <MaterialCommunityIcons name="arrow-left" size={22} color={colors.onSurface} />
      </Pressable>
      {recording ? (
        <Pressable onPress={confirmDelete} accessibilityRole="button" accessibilityLabel="Excluir gravação" style={styles.roundButton}>
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );

  if (recording === undefined) {
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (recording === null) {
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Gravação não encontrada</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { summary } = recording;
  const meetingLabel = MEETING_TYPE_OPTIONS.find((option) => option.id === recording.meetingType)?.label;
  const meta = [recording.preacher, recording.church, meetingLabel].filter(Boolean).join(' · ');
  const duration = playerStatus.duration > 0 ? playerStatus.duration : recording.durationSeconds;
  const progress = duration > 0 ? playerStatus.currentTime / duration : 0;

  return (
    <SafeAreaView style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.status}>{statusLabel(recording.status).toUpperCase()}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {summary?.title ?? 'Gravação'}
        </Text>
        {summary ? <Text style={styles.theme}>{summary.theme}</Text> : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}

        {recording.audioUrl ? (
          <View style={styles.player}>
            <Pressable onPress={togglePlay} accessibilityRole="button" accessibilityLabel={playerStatus.playing ? 'Pausar áudio' : 'Ouvir áudio'} style={styles.playButton}>
              <MaterialCommunityIcons name={playerStatus.playing ? 'pause' : 'play'} size={26} color={colors.onPrimary} />
            </Pressable>
            <View style={styles.playerBar}>
              <ProgressBar progress={progress} />
              <View style={styles.playerTimes}>
                <Text style={styles.time}>{formatClock(playerStatus.currentTime)}</Text>
                <Text style={styles.time}>{formatClock(duration)}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {recording.status === 'failed' ? (
          <Text style={styles.error}>{recording.error ?? 'Não foi possível resumir esta gravação.'}</Text>
        ) : null}
        {recording.status !== 'completed' && recording.status !== 'failed' ? (
          <Text style={styles.body}>Seu resumo ainda está sendo preparado. Volte em instantes.</Text>
        ) : null}

        {summary ? (
          <>
            <Section title="Pontos centrais">
              {summary.centralPoints.map((point, index) => (
                <View key={index} style={styles.card}>
                  <Text style={styles.cardTitle}>{`${index + 1}. ${point.title}`}</Text>
                  <Text style={styles.body}>{point.description}</Text>
                </View>
              ))}
            </Section>

            {summary.scripturesCited.length > 0 ? (
              <Section title="Escrituras citadas">
                {summary.scripturesCited.map((scripture, index) => (
                  <View key={index} style={styles.card}>
                    <Text style={styles.reference}>{scripture.reference}</Text>
                    {scripture.text ? <Text style={styles.verse}>{scripture.text}</Text> : null}
                  </View>
                ))}
              </Section>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Frase de Impacto</Text>
              <Text style={styles.sectionSubtitle}>Para inspirar seus círculos de fé</Text>
              <QuoteCard
                quote={summary.impactQuote}
                attribution={recording.preacher}
                dateLabel={formatQuoteDate(recording.createdAt)}
                style={quoteStyle}
                width={screenWidth - spacing.xl * 2}
              />
              <Pressable onPress={() => setQuoteSheetOpen(true)} accessibilityRole="button" accessibilityLabel="Customizar arte e compartilhar">
                <LinearGradient colors={['#E8265E', '#7B3FA8', '#0051D4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.quoteButton}>
                  <MaterialCommunityIcons name="palette-outline" size={18} color={colors.onPrimary} />
                  <Text style={styles.quoteButtonText}>Customizar Arte & Compartilhar</Text>
                </LinearGradient>
              </Pressable>
            </View>

            {summary.practicalTopics.length > 0 ? (
              <Section title="Tópicos práticos">
                {summary.practicalTopics.map((topic, index) => (
                  <View key={index} style={styles.topic}>
                    <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.tertiary} />
                    <Text style={[styles.body, styles.topicText]}>{topic}</Text>
                  </View>
                ))}
              </Section>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      {summary ? (
        <QuoteShareSheet
          visible={quoteSheetOpen}
          onClose={() => setQuoteSheetOpen(false)}
          quote={summary.impactQuote}
          attribution={recording.preacher}
          dateLabel={formatQuoteDate(recording.createdAt)}
          style={quoteStyle}
          onChangeStyle={changeQuoteStyle}
        />
      ) : null}
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  roundButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fonts.titleSemiBold, fontSize: 20, color: colors.onSurface },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl * 2, gap: spacing.md },
  status: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 1.5, color: colors.primary },
  title: { fontFamily: fonts.titleSemiBold, fontSize: 32, lineHeight: 38, color: colors.onSurface },
  theme: { fontFamily: fonts.verseItalic, fontSize: 17, lineHeight: 24, color: colors.onSurfaceVariant },
  meta: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.outline },
  player: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, padding: spacing.md, ...shadow },
  playButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  playerBar: { flex: 1, gap: 6 },
  playerTimes: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontFamily: fonts.body, fontSize: 11, color: colors.onSurfaceVariant },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary },
  section: { gap: spacing.sm, marginTop: spacing.md },
  sectionTitle: { fontFamily: fonts.titleSemiBold, fontSize: 22, color: colors.onSurface },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, padding: spacing.lg, gap: 4, ...shadow },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onSurface },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.onSurfaceVariant },
  reference: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  verse: { fontFamily: fonts.verse, fontSize: 16, lineHeight: 24, color: colors.onSurface },
  sectionSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
  quoteButton: { height: 52, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  quoteButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.onPrimary },
  topic: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  topicText: { flex: 1 },
});
