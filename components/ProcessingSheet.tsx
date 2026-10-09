import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { File } from 'expo-file-system';
import { useMutation, useQuery } from 'convex/react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import { BottomSheet } from './BottomSheet';
import { BrandLogo } from './BrandLogo';
import { ProgressBar } from './ProgressBar';
import { TextPromptModal } from './TextPromptModal';
import {
  DEFAULT_MEETING_TYPE,
  MEETING_TYPE_OPTIONS,
  nextMilestone,
  progressLabel,
  type MeetingType,
  type RecordingStatus,
} from '../lib/recordingSummary';
import { colors, fonts, radius, spacing } from '../theme/tokens';

interface Props {
  anonymousId: string;
  fileUri: string;
  durationSeconds: number;
}

type PromptField = 'church' | 'preacher' | null;

/**
 * Processing sheet shown over the recorder. Uploads the audio, then follows the
 * Convex document live while the action transcribes and summarizes it.
 *
 * Progress is stage-based (the speech API reports none): the server moves it
 * 10 -> 60 -> 90 -> 100 and the bar eases toward the next milestone meanwhile.
 */
export function ProcessingSheet({ anonymousId, fileUri, durationSeconds }: Props) {
  const generateUploadUrl = useMutation(api.recordings.generateUploadUrl);
  const createRecording = useMutation(api.recordings.createRecording);
  const updateMetadata = useMutation(api.recordings.updateRecordingMetadata);
  const retryRecording = useMutation(api.recordings.retryRecording);

  const [recordingId, setRecordingId] = useState<Id<'recordings'> | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [church, setChurch] = useState('');
  const [preacher, setPreacher] = useState('');
  const [meetingType, setMeetingType] = useState<MeetingType>(DEFAULT_MEETING_TYPE);
  const [prompt, setPrompt] = useState<PromptField>(null);
  const [shown, setShown] = useState(3);

  // Latest form values, read when the upload finishes (the user may edit while it runs).
  const formRef = useRef({ church, preacher, meetingType });
  useEffect(() => {
    formRef.current = { church, preacher, meetingType };
  }, [church, preacher, meetingType]);

  const recording = useQuery(api.recordings.getRecording, recordingId ? { anonymousId, recordingId } : 'skip');

  // Upload + create. Re-runs when `attempt` changes (retry after a failed upload).
  useEffect(() => {
    if (recordingId) return;
    let cancelled = false;
    (async () => {
      try {
        const uploadUrl = await generateUploadUrl({ anonymousId });
        const response = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': 'audio/mp4' }, body: new File(fileUri) });
        if (!response.ok) throw new Error('upload failed');
        const { storageId } = (await response.json()) as { storageId: Id<'_storage'> };
        const id = await createRecording({ anonymousId, audioStorageId: storageId, durationSeconds });
        if (cancelled) return;
        const form = formRef.current;
        if (form.church || form.preacher || form.meetingType !== DEFAULT_MEETING_TYPE) {
          await updateMetadata({ anonymousId, recordingId: id, church: form.church, preacher: form.preacher, meetingType: form.meetingType });
        }
        setRecordingId(id);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error && /limite|inválid|grande/i.test(error.message) ? error.message : null;
        setUploadError(message ?? 'Não foi possível enviar o áudio. Verifique sua conexão e tente novamente.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, recordingId, anonymousId, fileUri, durationSeconds, generateUploadUrl, createRecording, updateMetadata]);

  const status: RecordingStatus = recording?.status ?? 'uploading';
  const serverProgress = recording?.progress ?? 3;
  const failed = uploadError !== null || status === 'failed';
  const completed = status === 'completed';
  const errorMessage = uploadError ?? recording?.error ?? 'Não foi possível concluir. Tente novamente.';

  // Ease the shown percentage toward the server value, creeping toward the next milestone while a stage runs.
  useEffect(() => {
    if (failed) return;
    const timer = setInterval(() => {
      setShown((current) => {
        if (completed) return 100;
        if (current < serverProgress) return Math.min(serverProgress, current + 3);
        const ceiling = Math.max(serverProgress, nextMilestone(status) - 2);
        return Math.min(ceiling, current + 0.35);
      });
    }, 200);
    return () => clearInterval(timer);
  }, [failed, completed, serverProgress, status]);

  const handleMeetingType = (type: MeetingType) => {
    setMeetingType(type);
    if (recordingId) void updateMetadata({ anonymousId, recordingId, meetingType: type });
  };

  const handlePromptSubmit = (value: string) => {
    if (prompt === 'church') {
      setChurch(value.trim());
      if (recordingId) void updateMetadata({ anonymousId, recordingId, church: value });
    } else if (prompt === 'preacher') {
      setPreacher(value.trim());
      if (recordingId) void updateMetadata({ anonymousId, recordingId, preacher: value });
    }
    setPrompt(null);
  };

  const handleRetry = async () => {
    setShown(5);
    if (!recordingId) {
      setUploadError(null);
      setAttempt((current) => current + 1);
      return;
    }
    await retryRecording({ anonymousId, recordingId }).catch(() => undefined);
  };

  const handleSave = () => {
    if (!recordingId) return;
    try {
      new File(fileUri).delete();
    } catch {
      // Temporary file already gone.
    }
    router.replace({ pathname: '/diary/[id]', params: { id: recordingId } });
  };

  const topics = recording?.summary?.practicalTopics.length ?? 0;
  const showScriptureChip = status === 'summarizing' || completed;

  return (
    <BottomSheet visible onClose={() => undefined} heightRatio={0.92}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.badge}>
          <MaterialCommunityIcons name="star-four-points" size={12} color={colors.primary} />
          <Text style={styles.badgeText}>Santuário Digital AI</Text>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Preparando seu Resumo
        </Text>
        <Text style={styles.subtitle}>
          Nossa inteligência artificial está estruturando os pontos centrais, versículos e frases de impacto.
        </Text>

        <LinearGradient colors={['#FFE3EC', '#E4ECFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.progressCard}>
          <View style={styles.ring}>
            <BrandLogo size={44} />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel} numberOfLines={1}>
              {failed ? progressLabel('failed') : progressLabel(status)}
            </Text>
            <Text style={styles.progressPercent}>{`${Math.round(shown)}%`}</Text>
          </View>
          <ProgressBar progress={shown / 100} />
          {failed ? (
            <Text style={styles.errorText} accessibilityRole="alert">
              {errorMessage}
            </Text>
          ) : (
            <View style={styles.chips}>
              {showScriptureChip ? (
                <View style={[styles.chip, { backgroundColor: '#DDF3D6' }]}>
                  <MaterialCommunityIcons name="book-open-variant" size={13} color={colors.tertiary} />
                  <Text style={[styles.chipText, { color: colors.tertiary }]}>Detectando escrituras</Text>
                </View>
              ) : null}
              {topics > 0 ? (
                <View style={[styles.chip, { backgroundColor: '#DDE8FF' }]}>
                  <MaterialCommunityIcons name="star-four-points" size={13} color={colors.secondary} />
                  <Text style={[styles.chipText, { color: colors.secondary }]}>{`${topics} tópicos práticos`}</Text>
                </View>
              ) : null}
            </View>
          )}
        </LinearGradient>

        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Complete os dados do culto</Text>
          <Text style={styles.optional}>Opcional agora</Text>
        </View>

        <FieldCard icon="church" label="IGREJA / MINISTÉRIO" value={church} placeholder="Toque para informar" onPress={() => setPrompt('church')} />
        <FieldCard icon="account-voice" label="PREGADOR(A) / MINISTRO" value={preacher} placeholder="Toque para informar" onPress={() => setPrompt('preacher')} />

        <Text style={styles.fieldLabel}>TIPO DE REUNIÃO</Text>
        <View style={styles.typeRow} accessibilityRole="radiogroup">
          {MEETING_TYPE_OPTIONS.map((option) => {
            const selected = option.id === meetingType;
            return (
              <Pressable
                key={option.id}
                onPress={() => handleMeetingType(option.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={[styles.typeChip, selected && styles.typeChipSelected]}
              >
                {selected ? <MaterialCommunityIcons name="check" size={14} color={colors.onPrimary} /> : null}
                <Text style={[styles.typeText, selected && styles.typeTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {failed ? (
          <Pressable onPress={handleRetry} accessibilityRole="button" style={styles.retry}>
            <MaterialCommunityIcons name="refresh" size={18} color={colors.onPrimary} />
            <Text style={styles.saveText}>Tentar novamente</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSave}
            disabled={!completed}
            accessibilityRole="button"
            accessibilityState={{ disabled: !completed }}
            style={!completed && { opacity: 0.45 }}
          >
            <LinearGradient colors={['#E8265E', '#F7568A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveButton}>
              <MaterialCommunityIcons name="check" size={18} color={colors.onPrimary} />
              <Text style={styles.saveText}>Salvar</Text>
            </LinearGradient>
          </Pressable>
        )}
        <Text style={styles.footnote}>
          As anotações e o resumo serão salvos automaticamente em Meu Diário assim que a transcrição for concluída.
        </Text>
      </View>

      <TextPromptModal
        visible={prompt !== null}
        title={prompt === 'church' ? 'Igreja / Ministério' : 'Pregador(a) / Ministro'}
        placeholder={prompt === 'church' ? 'Nome da igreja' : 'Nome do pregador'}
        initialValue={prompt === 'church' ? church : preacher}
        onSubmit={handlePromptSubmit}
        onCancel={() => setPrompt(null)}
      />
    </BottomSheet>
  );
}

function FieldCard({ icon, label, value, placeholder, onPress }: { icon: 'church' | 'account-voice'; label: string; value: string; placeholder: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value || placeholder}`} style={styles.field}>
      <View style={styles.fieldIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.fieldTexts}>
        <Text style={styles.fieldTitle}>{label}</Text>
        <Text style={[styles.fieldValue, !value && styles.fieldPlaceholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
      </View>
      <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.outline} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceContainer, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  badgeText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primary },
  title: { fontFamily: fonts.titleSemiBold, fontSize: 30, color: colors.onSurface },
  subtitle: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.onSurfaceVariant },
  progressCard: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  ring: { alignSelf: 'center', padding: 6, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.7)', shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  progressLabel: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.onSurface },
  progressPercent: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, minHeight: 28 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
  errorText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  formTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onSurface },
  optional: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary },
  field: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceContainer, borderRadius: radius.lg, padding: spacing.md },
  fieldIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.selectedIconContainer, alignItems: 'center', justifyContent: 'center' },
  fieldTexts: { flex: 1 },
  fieldTitle: { fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 0.8, color: colors.onSurfaceVariant },
  fieldValue: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.onSurface },
  fieldPlaceholder: { fontFamily: fonts.body, color: colors.outline },
  fieldLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 0.8, color: colors.onSurfaceVariant, marginTop: spacing.sm },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surfaceContainer, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 9 },
  typeChipSelected: { backgroundColor: colors.primary },
  typeText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.onSurface },
  typeTextSelected: { color: colors.onPrimary },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  saveButton: { height: 54, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  retry: { height: 54, borderRadius: radius.pill, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },
  footnote: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: colors.onSurfaceVariant, textAlign: 'center' },
});
