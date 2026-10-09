/**
 * Pure helpers shared by the app and the Convex backend (no React Native / Convex imports).
 */

export interface RecordingSummary {
  title: string;
  theme: string;
  centralPoints: { title: string; description: string }[];
  scripturesCited: { reference: string; text: string }[];
  practicalTopics: string[];
  impactQuote: string;
}

export type RecordingStatus = 'uploading' | 'transcribing' | 'summarizing' | 'completed' | 'failed';

export const MEETING_TYPE_OPTIONS = [
  { id: 'celebration', label: 'Celebração' },
  { id: 'bible_school', label: 'Escola Bíblica' },
  { id: 'youth_service', label: 'Culto de Jovens' },
  { id: 'prayer', label: 'Oração' },
] as const;

export type MeetingType = (typeof MEETING_TYPE_OPTIONS)[number]['id'];

export const DEFAULT_MEETING_TYPE: MeetingType = 'celebration';

export function isMeetingType(value: unknown): value is MeetingType {
  return MEETING_TYPE_OPTIONS.some((option) => option.id === value);
}

/** Hard limits, enforced on the server and used by the recorder. */
export const MAX_RECORDING_SECONDS = 2 * 60 * 60;
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

/** Extracts the first JSON object from a model reply (tolerates code fences and prose). */
export function extractJsonObject(raw: string): unknown {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Validates the model output strictly; returns `null` when the shape is wrong. */
export function parseSummary(raw: string): RecordingSummary | null {
  const data = extractJsonObject(raw);
  if (!isRecord(data)) return null;

  const title = text(data.title);
  const theme = text(data.theme);
  const impactQuote = text(data.impactQuote);
  if (!title || !theme || !impactQuote) return null;
  if (!Array.isArray(data.centralPoints) || !Array.isArray(data.scripturesCited) || !Array.isArray(data.practicalTopics)) {
    return null;
  }

  const centralPoints: RecordingSummary['centralPoints'] = [];
  for (const item of data.centralPoints) {
    if (!isRecord(item)) return null;
    const pointTitle = text(item.title);
    const description = text(item.description);
    if (!pointTitle || !description) return null;
    centralPoints.push({ title: pointTitle, description });
  }

  const scripturesCited: RecordingSummary['scripturesCited'] = [];
  for (const item of data.scripturesCited) {
    if (!isRecord(item)) return null;
    const reference = text(item.reference);
    if (!reference) return null;
    scripturesCited.push({ reference, text: typeof item.text === 'string' ? item.text.trim() : '' });
  }

  const practicalTopics: string[] = [];
  for (const item of data.practicalTopics) {
    const topic = text(item);
    if (!topic) return null;
    practicalTopics.push(topic);
  }

  return { title, theme, centralPoints, scripturesCited, practicalTopics, impactQuote };
}

export function statusLabel(status: RecordingStatus): string {
  switch (status) {
    case 'uploading':
      return 'Enviando';
    case 'transcribing':
      return 'Transcrevendo';
    case 'summarizing':
      return 'Transcrição Concluída';
    case 'completed':
      return 'IA Resumido';
    case 'failed':
      return 'Falhou';
  }
}

/** Label shown next to the progress bar in the processing sheet. */
export function progressLabel(status: RecordingStatus): string {
  switch (status) {
    case 'uploading':
      return 'Enviando áudio';
    case 'transcribing':
      return 'Transcrevendo em alta fidelidade';
    case 'summarizing':
      return 'Detectando escrituras';
    case 'completed':
      return 'Resumo pronto';
    case 'failed':
      return 'Não foi possível concluir';
  }
}

/** Seconds -> "HH:MM:SS". */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(safe / 3600))}:${pad(Math.floor((safe % 3600) / 60))}:${pad(safe % 60)}`;
}

/** Seconds -> "1h 05min" / "12 min" / "45 s" for list cards. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  if (minutes > 0) return `${minutes} min`;
  return `${safe} s`;
}

/** Stage milestones (percent) that the sheet eases toward while a stage runs. */
export function nextMilestone(status: RecordingStatus): number {
  switch (status) {
    case 'uploading':
      return 10;
    case 'transcribing':
      return 60;
    case 'summarizing':
      return 90;
    default:
      return 100;
  }
}
