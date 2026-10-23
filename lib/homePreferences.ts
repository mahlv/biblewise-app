import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local favorites/bookmarks of the daily verse, keyed by `DailyVerse.key`.
 * TODO(sync): move to Convex once cross-device sync is needed.
 */
const KEYS = {
  favorites: '@biblewise/favoriteVerses',
  bookmarks: '@biblewise/bookmarkedVerses',
} as const;

export type VerseMark = keyof typeof KEYS;

async function readKeys(mark: VerseMark): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS[mark]);
    const value = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export async function isVerseMarked(mark: VerseMark, verseKey: string): Promise<boolean> {
  return (await readKeys(mark)).includes(verseKey);
}

/** Adds or removes the verse; returns the new state. Writes are best effort. */
export async function setVerseMarked(mark: VerseMark, verseKey: string, marked: boolean): Promise<void> {
  const current = await readKeys(mark);
  const next = marked ? [...new Set([...current, verseKey])] : current.filter((item) => item !== verseKey);
  await AsyncStorage.setItem(KEYS[mark], JSON.stringify(next)).catch(() => undefined);
}
