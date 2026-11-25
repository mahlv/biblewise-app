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

/** Meeting types; their names live in the translation files (`recording.meetingTypes.<id>`). */
export const MEETING_TYPE_OPTIONS = [{ id: 'celebration' }, { id: 'bible_school' }, { id: 'youth_service' }, { id: 'prayer' }] as const;

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

/** Seconds -> "HH:MM:SS". */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(safe / 3600))}:${pad(Math.floor((safe % 3600) / 60))}:${pad(safe % 60)}`;
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

interface TeaserOptions {
  /** Longest teaser, in characters (the first item is shortened to fit). */
  maxChars?: number;
  /** Most items shown before the "+N". */
  maxItems?: number;
}

/**
 * One-line preview of a collapsed list: "Salmos 100, 1 Tessalonicenses 5:18 +2".
 * Blank items are ignored; the first item is always shown (ellipsized if it is too long).
 */
export function buildTeaser(items: string[], { maxChars = 48, maxItems = 2 }: TeaserOptions = {}): string {
  const clean = items.map((item) => item.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const first = clean[0];
  if (!first) return '';

  let teaser = first.length > maxChars ? `${first.slice(0, maxChars - 1).trimEnd()}…` : first;
  let shown = 1;
  while (shown < Math.min(maxItems, clean.length)) {
    const next = `${teaser}, ${clean[shown]}`;
    if (next.length > maxChars) break;
    teaser = next;
    shown += 1;
  }
  const hidden = clean.length - shown;
  return hidden > 0 ? `${teaser} +${hidden}` : teaser;
}
