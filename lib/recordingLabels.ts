import i18n from './i18n';
import type { RecordingStatus } from './recordingSummary';
import { isMeetingType } from './recordingSummary';

/** Text shown for a recording status (chips and cards), in the app language. */
export function statusLabel(status: RecordingStatus): string {
  return i18n.t(`recordingStatus.${status}`);
}

/** Label shown next to the progress bar in the processing sheet. */
export function progressLabel(status: RecordingStatus): string {
  return i18n.t(`recordingProgress.${status}`);
}

/** Seconds -> "1h 05min" / "12 min" / "45 s" (units follow the app language). */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) return i18n.t('duration.hoursMinutes', { hours, minutes: String(minutes).padStart(2, '0') });
  if (minutes > 0) return i18n.t('duration.minutes', { count: minutes });
  return i18n.t('duration.seconds', { count: safe });
}

/** Name of a meeting type ("Celebração"); unknown or missing types read as a generic service. */
export function meetingTypeLabel(type: unknown): string {
  return isMeetingType(type) ? i18n.t(`recording.meetingTypes.${type}`) : i18n.t('recording.meetingTypes.fallback');
}
