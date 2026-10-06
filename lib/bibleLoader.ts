import { BIBLE_BOOKS, findBook, parseBibleReference } from './bibleReference';
import { BIBLE_VERSION_REGISTRY } from './bibleVersions';
import type { BibleVersion, BibleVersionMeta, Book, Chapter, ParsedReference, ReadingPosition } from '../types/bible';

const cache = new Map<string, BibleVersion>();

/** Metadata of every available version (does not parse any JSON). */
export function loadAllVersions(): BibleVersionMeta[] {
  return BIBLE_VERSION_REGISTRY.map(({ code, label, name, language }) => ({ code, label, name, language }));
}

export function isKnownVersion(code: unknown): code is string {
  return typeof code === 'string' && BIBLE_VERSION_REGISTRY.some((entry) => entry.code === code);
}

/** Loads and normalizes a version on first use; later calls hit the cache. */
export function loadVersion(code: string): BibleVersion {
  const cached = cache.get(code);
  if (cached) return cached;

  const entry = BIBLE_VERSION_REGISTRY.find((item) => item.code === code) ?? BIBLE_VERSION_REGISTRY[0];
  if (!entry) throw new Error('No Bible versions registered.');
  if (entry.code !== code && cache.has(entry.code)) return cache.get(entry.code)!;

  const raw = entry.load();
  const books: Book[] = raw.map((rawBook, id) => ({
    id,
    name: rawBook.name,
    abbrev: rawBook.abbrev,
    // JSON order is canonical, so the index maps straight to BIBLE_BOOKS.
    testament: BIBLE_BOOKS[id]?.testamento ?? (id < 39 ? 'AT' : 'NT'),
    chapters: rawBook.chapters.map(
      (verses, chapterIndex): Chapter => ({
        number: chapterIndex + 1,
        verses: verses.map((text, verseIndex) => ({ number: verseIndex + 1, text: text.trim() })),
      }),
    ),
  }));

  const version: BibleVersion = {
    code: entry.code,
    label: entry.label,
    name: entry.name,
    language: entry.language,
    books,
  };
  cache.set(entry.code, version);
  return version;
}

export function getBook(versionCode: string, bookId: number): Book | undefined {
  return loadVersion(versionCode).books[bookId];
}

export function getChapter(versionCode: string, bookId: number, chapterNumber: number): Chapter | undefined {
  return getBook(versionCode, bookId)?.chapters[chapterNumber - 1];
}

/** Clamps a position to what exists in this version (versification differs between versions). */
export function clampPosition(versionCode: string, position: ReadingPosition): ReadingPosition {
  const { books } = loadVersion(versionCode);
  const bookId = Math.min(Math.max(Math.trunc(position.bookId) || 0, 0), books.length - 1);
  const total = books[bookId]?.chapters.length ?? 1;
  const chapter = Math.min(Math.max(Math.trunc(position.chapter) || 1, 1), total);
  return { bookId, chapter };
}

/** Previous/next chapter, crossing book boundaries. `null` at the Bible's edges. */
export function getAdjacentChapter(
  versionCode: string,
  position: ReadingPosition,
  direction: 'previous' | 'next',
): ReadingPosition | null {
  const { books } = loadVersion(versionCode);
  const book = books[position.bookId];
  if (!book) return null;

  if (direction === 'next') {
    if (position.chapter < book.chapters.length) return { bookId: position.bookId, chapter: position.chapter + 1 };
    return position.bookId < books.length - 1 ? { bookId: position.bookId + 1, chapter: 1 } : null;
  }
  if (position.chapter > 1) return { bookId: position.bookId, chapter: position.chapter - 1 };
  const previous = books[position.bookId - 1];
  return previous ? { bookId: previous.id, chapter: previous.chapters.length } : null;
}

/**
 * Parses "João 3:16", "Gênesis 1" or just "Gên" into a position. Reuses the app's
 * existing reference parser. Returns `null` when nothing matches.
 */
export function parseReference(input: string, versionCode?: string): ParsedReference | null {
  const parsed = parseBibleReference(input);
  if (!parsed) {
    // Book name alone ("Gên", "1 João") opens chapter 1.
    const book = /\d\s*[:.]/.test(input) ? null : findBook(input);
    return book ? { bookId: book.order - 1, chapter: 1 } : null;
  }

  const bookId = parsed.ordem - 1;
  if (!versionCode) {
    return { bookId, chapter: parsed.capitulo, verse: hasVerse(input) ? parsed.versiculoInicial : undefined };
  }
  const book = getBook(versionCode, bookId);
  if (!book || parsed.capitulo > book.chapters.length) return null;
  const verse = hasVerse(input) ? parsed.versiculoInicial : undefined;
  if (verse && verse > (book.chapters[parsed.capitulo - 1]?.verses.length ?? 0)) return null;
  return { bookId, chapter: parsed.capitulo, verse };
}

/** The shared parser defaults to verse 1; detect whether the user actually typed a verse. */
function hasVerse(input: string): boolean {
  return /\d\s*[:.]\s*\d/.test(input) || /[A-Za-zÀ-ÿ]\s+\d+\s+\d+\s*$/.test(input);
}
