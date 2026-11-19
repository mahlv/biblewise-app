import { Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { recordingFileName } from './recordingShareText';

export type ShareAudioResult = 'shared' | 'cancelled' | 'unavailable' | 'failed';

/** Above this size some apps refuse the file, so the user is asked first. */
const LARGE_FILE_BYTES = 16 * 1024 * 1024;

/** Asks whether to share a big file anyway; resolves `true` to continue. */
function confirmLargeFile(megabytes: number): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Áudio grande',
      `Este áudio tem ${megabytes.toFixed(0)} MB. Alguns aplicativos recusam arquivos desse tamanho. Compartilhar mesmo assim?`,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Compartilhar', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * Sends a recording's audio through the system share sheet (WhatsApp, Telegram, Drive...).
 * The share sheet needs a local file, so the audio is downloaded to the cache first and
 * removed afterwards. `expo-sharing` is loaded lazily so a build without the native module
 * reports `unavailable` instead of crashing.
 */
export async function shareRecordingAudio(audioUrl: string, title: string | undefined): Promise<ShareAudioResult> {
  let Sharing: typeof import('expo-sharing');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Sharing = require('expo-sharing') as typeof import('expo-sharing');
    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  } catch {
    return 'unavailable';
  }

  let file: File | null = null;
  try {
    file = await File.downloadFileAsync(audioUrl, new File(Paths.cache, recordingFileName(title)), { idempotent: true });

    const size = file.size ?? 0;
    if (size > LARGE_FILE_BYTES && !(await confirmLargeFile(size / (1024 * 1024)))) return 'cancelled';

    await Sharing.shareAsync(file.uri, { mimeType: 'audio/mp4', UTI: 'public.mpeg-4-audio', dialogTitle: 'Compartilhar áudio' });
    return 'shared';
  } catch {
    return 'failed';
  } finally {
    try {
      if (file?.exists) file.delete();
    } catch {
      // The cache is cleaned by the system anyway.
    }
  }
}
