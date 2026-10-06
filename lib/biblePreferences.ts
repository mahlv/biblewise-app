import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReadingPosition } from '../types/bible';

/**
 * Local reading preferences.
 * TODO(sync): mirror these in Convex (users table) once cross-device sync is needed.
 */
const KEYS = {
  version: '@biblewise/selectedBibleVersion',
  theme: '@biblewise/selectedThemeId',
  position: '@biblewise/lastReadPosition',
  highlights: '@biblewise/verseHighlights',
} as const;

export interface StoredBiblePreferences {
  versionCode: string | null;
  themeId: string | null;
  position: ReadingPosition | null;
}

function parsePosition(raw: string | null | undefined): ReadingPosition | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ReadingPosition>;
    if (Number.isInteger(value.bookId) && Number.isInteger(value.chapter)) {
      return { bookId: value.bookId as number, chapter: value.chapter as number };
    }
  } catch {
    // Corrupted value: treated as missing.
  }
  return null;
}

export async function readBiblePreferences(): Promise<StoredBiblePreferences> {
  try {
    const values = new Map(await AsyncStorage.multiGet([KEYS.version, KEYS.theme, KEYS.position]));
    return {
      versionCode: values.get(KEYS.version) || null,
      themeId: values.get(KEYS.theme) || null,
      position: parsePosition(values.get(KEYS.position)),
    };
  } catch {
    return { versionCode: null, themeId: null, position: null };
  }
}

/** Writes are best effort: a failure must never block reading. */
export async function saveVersionCode(code: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.version, code).catch(() => undefined);
}

export async function saveThemeId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.theme, id).catch(() => undefined);
}

export async function savePosition(position: ReadingPosition): Promise<void> {
  await AsyncStorage.setItem(KEYS.position, JSON.stringify(position)).catch(() => undefined);
}

/** Highlighted verses keyed by "bookId:chapter" (version-independent). */
export type VerseHighlights = Record<string, number[]>;

export async function readHighlights(): Promise<VerseHighlights> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.highlights);
    const value = raw ? (JSON.parse(raw) as unknown) : null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const clean: VerseHighlights = {};
    for (const [key, verses] of Object.entries(value as Record<string, unknown>)) {
      if (Array.isArray(verses)) clean[key] = verses.filter((verse): verse is number => Number.isInteger(verse));
    }
    return clean;
  } catch {
    return {};
  }
}

export async function saveHighlights(highlights: VerseHighlights): Promise<void> {
  await AsyncStorage.setItem(KEYS.highlights, JSON.stringify(highlights)).catch(() => undefined);
}
