import { DAILY_VERSES } from '../constants/dailyVerses';
import { getBook, getChapter, loadVersion } from './bibleLoader';
import type { Chapter } from '../types/bible';

export interface DailyVerse {
  /** Stable, version-independent id (used to persist favorites/bookmarks). */
  key: string;
  text: string;
  /** Human reference, e.g. "Salmos 23:1–2". */
  reference: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Verse numbering the curated references were written against (and the Psalms book index). */
const REFERENCE_VERSION = 'TB-PT';
const PSALMS_BOOK_ID = 18;

const lastVerseNumber = (chapter: Chapter): number => chapter.verses[chapter.verses.length - 1]?.number ?? 0;

/** The card is a quote, not a reading: longer passages would make it too tall. */
const MAX_TEXT_LENGTH = 220;
/** How many verses a passage may grow to reach a sentence boundary. */
const MAX_EXTEND_BACK = 2;
const MAX_EXTEND_FORWARD = 3;

/** True when the text finishes a sentence (ignoring closing quotes/brackets). */
export function endsSentence(text: string): boolean {
  const trimmed = text.trim().replace(/[\s"'”’»)\]]+$/u, '');
  return /[.!?…؟。]$/u.test(trimmed);
}

/** False when the text starts in the middle of a sentence (first letter is lowercase). */
export function startsSentence(text: string): boolean {
  const letter = text.match(/\p{L}/u)?.[0];
  if (!letter) return true;
  // Scripts without letter case (Arabic, ...) cannot be judged: treat them as a sentence start.
  return letter === letter.toUpperCase();
}

/** Days since epoch for the device's *local* calendar day, so the verse changes at local midnight. */
function localDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

/** Picks the same verse for the whole day from the curated list, reading the text from the local Bible JSON. */
export function getDailyVerse(versionCode: string, date: Date = new Date()): DailyVerse | null {
  const total = DAILY_VERSES.length;
  const start = ((localDayNumber(date) % total) + total) % total;
  const version = loadVersion(versionCode);

  // Try the day's pick first; fall back to the next ones if a version lacks that passage.
  for (let offset = 0; offset < total; offset += 1) {
    const entry = DAILY_VERSES[(start + offset) % total];
    if (!entry) continue;
    const book = getBook(versionCode, entry.bookId);
    const chapter = getChapter(versionCode, entry.bookId, entry.chapter);
    if (!book || !chapter) continue;

    // Some versions number Psalms (or whole chapters) differently; a right label over the wrong text is worse than another verse.
    if (version.numbering === 'vulgate' && entry.bookId === PSALMS_BOOK_ID) continue;
    if (!version.language.startsWith('pt')) {
      const reference = getChapter(REFERENCE_VERSION, entry.bookId, entry.chapter);
      if (reference && lastVerseNumber(reference) !== lastVerseNumber(chapter)) continue;
    }

    const verses = chapter.verses.filter((verse) => verse.number >= entry.from && verse.number <= entry.to);
    if (verses.length !== entry.to - entry.from + 1) continue;

    // Bible verses often split a sentence in two: grow the passage until it reads as whole sentences.
    const byNumber = new Map(chapter.verses.map((verse) => [verse.number, verse]));
    let from = entry.from;
    let to = entry.to;
    for (let grown = 0; grown < MAX_EXTEND_BACK && !startsSentence(byNumber.get(from)?.text ?? ''); grown += 1) {
      if (!byNumber.has(from - 1)) break;
      from -= 1;
    }
    for (let grown = 0; grown < MAX_EXTEND_FORWARD && !endsSentence(byNumber.get(to)?.text ?? ''); grown += 1) {
      if (!byNumber.has(to + 1)) break;
      to += 1;
    }

    const passage: string[] = [];
    for (let number = from; number <= to; number += 1) passage.push(byNumber.get(number)?.text ?? '');
    const text = passage.join(' ');
    if (!startsSentence(passage[0] ?? '') || !endsSentence(passage[passage.length - 1] ?? '') || text.length > MAX_TEXT_LENGTH) continue;

    const range = to > from ? `${from}–${to}` : `${from}`;
    return {
      // Keyed by the curated passage so saved favorites/bookmarks survive the sentence completion.
      key: `${entry.bookId}:${entry.chapter}:${entry.from}-${entry.to}`,
      text,
      reference: `${book.name} ${entry.chapter}:${range}`,
    };
  }
  return null;
}
