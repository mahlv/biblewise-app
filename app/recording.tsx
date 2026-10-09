import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { File } from 'expo-file-system';
import {
  AudioQuality,
  IOSOutputFormat,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProcessingSheet } from '../components/ProcessingSheet';
import { RecordingWaveform } from '../components/RecordingWaveform';
import { useOnboarding } from '../hooks/useOnboarding';
import { useToast } from '../hooks/useToast';
import { MAX_RECORDING_SECONDS, formatClock } from '../lib/recordingSummary';
import { colors, fonts, radius, spacing } from '../theme/tokens';

/**
 * Speech-optimized recording: mono, 16 kHz, ~24 kbps AAC (.m4a), about 11 MB per hour.
 * That keeps a 2 h message under the 25 MB speech-to-text file limit.
 * Files go to the document directory so they survive until the server confirms them.
 */
const RECORDING_OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 24000,
  isMeteringEnabled: true,
  directory: 'document',
  android: { extension: '.m4a', outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: { extension: '.m4a', outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MEDIUM },
  web: { mimeType: 'audio/webm', bitsPerSecond: 24000 },
};

/** Maps metering (dB, roughly -60..0) to 0..1. */
function meteringToLevel(db: number | undefined): number | undefined {
  if (db === undefined || !Number.isFinite(db)) return undefined;
  return Math.min(1, Math.max(0, (db + 60) / 60));
}

type Phase = 'starting' | 'recording' | 'paused' | 'saved';

/** Full-screen recorder. Starts automatically; transcript and summary happen only after saving. */
export default function RecordingScreen() {
  const toast = useToast();
  const { anonymousId } = useOnboarding();
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const state = useAudioRecorderState(recorder, 250);

  const [phase, setPhase] = useState<Phase>('starting');
  const [silentMode, setSilentMode] = useState(false);
  const [file, setFile] = useState<{ uri: string; durationSeconds: number } | null>(null);
  const startedRef = useRef(false);
  const savedRef = useRef(false);
  const savingRef = useRef(false);
  const durationRef = useRef(0);

  const durationSeconds = Math.floor(state.durationMillis / 1000);
  useEffect(() => {
    durationRef.current = durationSeconds;
  }, [durationSeconds]);

  /** Stops the recorder (if running) and deletes the temporary file. */
  const discard = useCallback(async () => {
    try {
      if (startedRef.current) await recorder.stop();
    } catch {
      // Already stopped.
    }
    startedRef.current = false;
    try {
      if (recorder.uri) new File(recorder.uri).delete();
    } catch {
      // File may not exist.
    }
  }, [recorder]);

  // Start automatically once the microphone permission is granted.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const permission = await requestRecordingPermissionsAsync();
      if (cancelled) return;
      if (!permission.granted) {
        Alert.alert(
          'Microfone necessário',
          'Permita o acesso ao microfone nas configurações para gravar a mensagem.',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => router.back() },
            {
              text: 'Abrir configurações',
              onPress: () => {
                void Linking.openSettings();
                router.back();
              },
            },
          ],
          { cancelable: false },
        );
        return;
      }
      try {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'doNotMix',
        });
        await recorder.prepareToRecordAsync();
        if (cancelled) return;
        recorder.record();
        startedRef.current = true;
        setPhase('recording');
      } catch {
        if (cancelled) return;
        Alert.alert('Não foi possível gravar', 'Verifique o microfone e tente novamente.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recorder]);

  // Keep the screen awake while this screen is open.
  useEffect(() => {
    void activateKeepAwakeAsync('recording');
    return () => {
      void deactivateKeepAwake('recording');
    };
  }, []);

  // Leaving without saving discards the temporary file.
  useEffect(
    () => () => {
      if (!savedRef.current) void discard();
    },
    [discard],
  );

  const confirmDiscard = useCallback(() => {
    Alert.alert('Descartar gravação?', 'A gravação atual será apagada e não poderá ser recuperada.', [
      { text: 'Continuar gravando', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: async () => {
          await discard();
          router.back();
        },
      },
    ]);
  }, [discard]);

  // Android back button asks before throwing the recording away (unless already saved).
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!savedRef.current) confirmDiscard();
      return true;
    });
    return () => subscription.remove();
  }, [confirmDiscard]);

  const handleToggle = () => {
    if (phase === 'recording') {
      recorder.pause();
      setPhase('paused');
    } else if (phase === 'paused') {
      recorder.record();
      setPhase('recording');
    }
  };

  const handleSave = useCallback(async () => {
    if (savingRef.current || !startedRef.current) return;
    savingRef.current = true;
    try {
      await recorder.stop();
      startedRef.current = false;
      const uri = recorder.uri;
      if (!uri) throw new Error('missing uri');
      savedRef.current = true;
      setPhase('saved');
      setFile({ uri, durationSeconds: Math.max(1, durationRef.current) });
    } catch {
      savingRef.current = false;
      toast('Não foi possível salvar a gravação');
    }
  }, [recorder, toast]);

  // Stop automatically at the 2 h limit.
  useEffect(() => {
    if (durationSeconds < MAX_RECORDING_SECONDS) return;
    const timer = setTimeout(() => void handleSave(), 0);
    return () => clearTimeout(timer);
  }, [durationSeconds, handleSave]);

  /**
   * Silent mode is best effort: no cross-platform API mutes notifications.
   * Android: opens the system Do Not Disturb settings (needs the user's confirmation).
   * iOS: Do Not Disturb/Focus can only be turned on by the user from Control Center.
   */
  const handleSilentMode = (value: boolean) => {
    setSilentMode(value);
    if (!value) return;
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.ZEN_MODE_PRIORITY_SETTINGS').catch(() => toast('Ative o modo Não Perturbe nas configurações'));
    } else {
      toast('Ative um Foco (Não Perturbe) pela Central de Controle');
    }
  };

  const isRecording = phase === 'recording';
  const label = isRecording ? 'Gravando' : phase === 'paused' ? 'Pausado' : 'Iniciando';
  const level = meteringToLevel(state.metering);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <LinearGradient colors={['#101A44', '#070B1F', '#02030A']} style={styles.card}>
        <View style={styles.glow} pointerEvents="none" />

        <View style={styles.statusPill} accessibilityLiveRegion="polite">
          <View style={[styles.dot, !isRecording && styles.dotPaused]} />
          <Text style={styles.statusText}>{label}</Text>
        </View>

        <View style={styles.center}>
          <Text style={styles.timer} accessibilityRole="timer">
            {formatClock(durationSeconds)}
          </Text>
          <RecordingWaveform active={isRecording} level={level} />
          <Text style={styles.caption}>Captação de voz em alta fidelidade ativa</Text>

          <Pressable
            onPress={handleToggle}
            disabled={phase === 'starting' || phase === 'saved'}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? 'Pausar gravação' : 'Retomar gravação'}
            style={({ pressed }) => [styles.mainButtonShadow, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient colors={['#FF4D6D', '#C1123F']} style={styles.mainButton}>
              <MaterialCommunityIcons name={isRecording ? 'pause' : 'play'} size={44} color={colors.onPrimary} />
            </LinearGradient>
          </Pressable>

          <Text style={styles.helper}>
            Gravando a mensagem pastoral. Ao concluir, os resumos temáticos, tópicos oratórios e referências bíblicas serão
            organizados em seu diário.
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.bottom}>
        <View style={styles.silentCard}>
          <View style={styles.silentIcon}>
            <MaterialCommunityIcons name="bell-off-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.silentTexts}>
            <Text style={styles.silentTitle}>Modo Silencioso do Celular</Text>
            <Text style={styles.silentBody}>Notificações e toques mutados durante o culto</Text>
          </View>
          <Switch
            value={silentMode}
            onValueChange={handleSilentMode}
            trackColor={{ true: colors.primary, false: '#E7CFCF' }}
            thumbColor={colors.onPrimary}
            accessibilityLabel="Modo silencioso do celular"
          />
        </View>

        <Pressable
          onPress={handleSave}
          disabled={phase === 'starting' || phase === 'saved'}
          accessibilityRole="button"
          accessibilityLabel="Salvar e Resumir Palavra"
          style={({ pressed }) => [(phase === 'starting' || phase === 'saved') && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
        >
          <LinearGradient colors={['#E8265E', '#F7568A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveButton}>
            <MaterialCommunityIcons name="check" size={20} color={colors.onPrimary} />
            <Text style={styles.saveText}>Salvar e Resumir Palavra</Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={confirmDiscard} disabled={phase === 'saved'} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.discard}>Descartar Gravação</Text>
        </Pressable>
      </View>

      {file && anonymousId ? (
        <ProcessingSheet anonymousId={anonymousId} fileUri={file.uri} durationSeconds={file.durationSeconds} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg },
  card: { flex: 1, borderRadius: radius.xl, padding: spacing.xl, overflow: 'hidden' },
  glow: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(232, 38, 94, 0.22)',
  },
  statusPill: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D6D' },
  dotPaused: { backgroundColor: '#F7F052' },
  statusText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: '#F4ECEC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly' },
  timer: { fontFamily: fonts.titleMedium, fontSize: 56, color: '#F8F1F1', letterSpacing: 2 },
  caption: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(244,236,236,0.55)' },
  mainButtonShadow: {
    shadowColor: '#FF4D6D',
    shadowOpacity: 0.7,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  mainButton: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  helper: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: 'rgba(244,236,236,0.6)', textAlign: 'center', paddingHorizontal: spacing.md },
  bottom: { gap: spacing.md, paddingBottom: spacing.sm },
  silentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  silentIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.selectedIconContainer, alignItems: 'center', justifyContent: 'center' },
  silentTexts: { flex: 1 },
  silentTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onSurface },
  silentBody: { fontFamily: fonts.body, fontSize: 11, color: colors.onSurfaceVariant },
  saveButton: { height: 54, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },
  discard: { textAlign: 'center', fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primary },
});
