import { DAILY_VERSES } from '../constants/dailyVerses';
import { getChapter, getBook } from './bibleLoader';

export interface DailyVerse {
  /** Stable, version-independent id (used to persist favorites/bookmarks). */
  key: string;
  text: string;
  /** Human reference, e.g. "Salmos 23:1–2". */
  reference: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days since epoch for the device's *local* calendar day, so the verse changes at local midnight. */
function localDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

/** Picks the same verse for the whole day from the curated list, reading the text from the local Bible JSON. */
export function getDailyVerse(versionCode: string, date: Date = new Date()): DailyVerse | null {
  const total = DAILY_VERSES.length;
  const start = ((localDayNumber(date) % total) + total) % total;

  // Try the day's pick first; fall back to the next ones if a version lacks that passage.
  for (let offset = 0; offset < total; offset += 1) {
    const entry = DAILY_VERSES[(start + offset) % total];
    if (!entry) continue;
    const book = getBook(versionCode, entry.bookId);
    const chapter = getChapter(versionCode, entry.bookId, entry.chapter);
    if (!book || !chapter) continue;

    const verses = chapter.verses.filter((verse) => verse.number >= entry.from && verse.number <= entry.to);
    if (verses.length === 0) continue;

    const range = entry.to > entry.from ? `${entry.from}–${entry.to}` : `${entry.from}`;
    return {
      key: `${entry.bookId}:${entry.chapter}:${entry.from}-${entry.to}`,
      text: verses.map((verse) => verse.text).join(' '),
      reference: `${book.name} ${entry.chapter}:${range}`,
    };
  }
  return null;
}
