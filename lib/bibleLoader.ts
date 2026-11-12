import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { BIBLE_BOOKS, findBook, normalizeKey, parseBibleReference, splitReference, type SplitReference } from './bibleReference';
import { BIBLE_VERSION_REGISTRY, type BibleVersionEntry, type RawBook } from './bibleVersions';
import type { BibleVersion, BibleVersionMeta, Book, Chapter, ParsedReference, ReadingPosition } from '../types/bible';

/** Parsed versions. Insertion order = least recently used first (used to evict asset versions). */
const cache = new Map<string, BibleVersion>();
const pending = new Map<string, Promise<void>>();

/** Each parsed asset version holds ~4 MB of text; keep only the most recent few in memory. */
const ASSET_CACHE_LIMIT = 3;

/** Fallback when a code is unknown or an asset version has not been loaded yet. */
const DEFAULT_ENTRY = BIBLE_VERSION_REGISTRY.find((entry) => entry.load) ?? BIBLE_VERSION_REGISTRY[0];

const toMeta = ({ load: _load, asset: _asset, ...meta }: BibleVersionEntry): BibleVersionMeta => meta;

const findEntry = (code: string): BibleVersionEntry | undefined => BIBLE_VERSION_REGISTRY.find((entry) => entry.code === code);

/** Metadata of every available version (does not parse any data). */
export function loadAllVersions(): BibleVersionMeta[] {
  return BIBLE_VERSION_REGISTRY.map(toMeta);
}

export function isKnownVersion(code: unknown): code is string {
  return typeof code === 'string' && BIBLE_VERSION_REGISTRY.some((entry) => entry.code === code);
}

/** Turns the raw data into the app's model. Verse numbers are index + 1; empty strings are omitted verses. */
function buildVersion(entry: BibleVersionEntry, raw: RawBook[]): BibleVersion {
  const books: Book[] = raw.map((rawBook, id) => ({
    id,
    name: rawBook.name,
    abbrev: rawBook.abbrev,
    // JSON order is canonical, so the index maps straight to BIBLE_BOOKS; extra books (deuterocanon) follow the Old Testament.
    testament: id < BIBLE_BOOKS.length ? (BIBLE_BOOKS[id]?.testamento ?? (id < 39 ? 'AT' : 'NT')) : 'AT',
    chapters: rawBook.chapters.map(
      (verses, chapterIndex): Chapter => ({
        number: chapterIndex + 1,
        verses: verses.flatMap((text, verseIndex) => {
          const trimmed = text.trim();
          return trimmed ? [{ number: verseIndex + 1, text: trimmed }] : [];
        }),
      }),
    ),
  }));
  return { ...toMeta(entry), books };
}

function store(entry: BibleVersionEntry, version: BibleVersion): void {
  cache.delete(entry.code);
  cache.set(entry.code, version);
  if (entry.load) return;

  // Evict the least recently used asset versions beyond the limit (inline versions stay).
  const assetCodes = [...cache.keys()].filter((code) => findEntry(code)?.asset !== undefined);
  for (const code of assetCodes.slice(0, Math.max(0, assetCodes.length - ASSET_CACHE_LIMIT))) cache.delete(code);
}

/** Marks a cached version as the most recently used. */
function touch(code: string, version: BibleVersion): BibleVersion {
  cache.delete(code);
  cache.set(code, version);
  return version;
}

/**
 * Returns a parsed version synchronously. Inline versions are parsed on first use; asset versions
 * must have been loaded with `ensureVersionLoaded` — otherwise the default version is returned.
 */
export function loadVersion(code: string): BibleVersion {
  const cached = cache.get(code);
  if (cached) return findEntry(code)?.asset !== undefined ? touch(code, cached) : cached;

  const entry = findEntry(code) ?? DEFAULT_ENTRY;
  if (!entry) throw new Error('No Bible versions registered.');
  const known = cache.get(entry.code);
  if (known) return known;

  if (entry.load) {
    const version = buildVersion(entry, entry.load());
    store(entry, version);
    return version;
  }

  // Asset version that is not in memory (not loaded yet, or evicted): show the default instead of crashing.
  if (__DEV__) console.warn(`Bible version ${code} used before ensureVersionLoaded(); falling back to the default version.`);
  if (!DEFAULT_ENTRY?.load || entry === DEFAULT_ENTRY) throw new Error(`Bible version ${code} is not loaded.`);
  return loadVersion(DEFAULT_ENTRY.code);
}

/** True when `loadVersion(code)` can answer without a fallback. */
export function isVersionLoaded(code: string): boolean {
  const entry = findEntry(code);
  return !!entry && (!!entry.load || cache.has(entry.code));
}

/** Reads and parses an asset version (no-op for inline versions or versions already in memory). */
export function ensureVersionLoaded(code: string): Promise<void> {
  const entry = findEntry(code);
  if (!entry || entry.load) return Promise.resolve();

  const cached = cache.get(entry.code);
  if (cached) {
    touch(entry.code, cached);
    return Promise.resolve();
  }

  let inFlight = pending.get(entry.code);
  if (!inFlight) {
    inFlight = readAssetVersion(entry).finally(() => pending.delete(entry.code));
    pending.set(entry.code, inFlight);
  }
  return inFlight;
}

async function readAssetVersion(entry: BibleVersionEntry): Promise<void> {
  if (entry.asset === undefined) return;
  const asset = Asset.fromModule(entry.asset);
  // Dev: downloads from Metro and caches; release: the file is already local.
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const raw = JSON.parse(await new File(uri).text()) as RawBook[];
  store(entry, buildVersion(entry, raw));
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

/** Matches a typed book against the version's own names/abbreviations (spaces and accents ignored). */
function findVersionBook(version: BibleVersion, text: string, prefix: boolean): Book | undefined {
  const key = normalizeKey(text).replace(/ /g, '');
  if (!key) return undefined;
  const keys = (book: Book) => [normalizeKey(book.name).replace(/ /g, ''), normalizeKey(book.abbrev).replace(/ /g, '')];
  if (!prefix) return version.books.find((book) => keys(book).includes(key));
  if (key.length < 3) return undefined;
  return version.books.find((book) => keys(book).some((name) => name.startsWith(key)));
}

/** Validates a reference typed with the version's own book names. */
function referenceInBook(version: BibleVersion, book: Book, split: SplitReference): ParsedReference | null {
  const chapter = book.chapters[split.capitulo - 1];
  if (!chapter) return null;
  const verse = split.versiculoInicial;
  if (verse !== undefined && !chapter.verses.some((item) => item.number === verse)) return null;
  return { bookId: book.id, chapter: split.capitulo, verse };
}

/**
 * Parses "João 3:16", "Gênesis 1" or just "Gên" into a position. Portuguese names always work; the
 * names of the selected version ("John 3:16" in KJV, "Jean 3:16" in LSG) work too.
 * Returns `null` when nothing matches. `bookMissing` is set when the book exists but this version
 * does not contain it (e.g. a New Testament book in an Old-Testament-only version).
 */
export function parseReference(input: string, versionCode?: string): ParsedReference | null {
  const split = splitReference(input);
  const version = versionCode ? loadVersion(versionCode) : undefined;
  // Portuguese versions keep the Portuguese parser first: it disambiguates "Jo" (João) from "Jó".
  const ownFirst = !!version && !version.language.startsWith('pt');

  if (version && split && ownFirst) {
    const own = findVersionBook(version, split.livroBruto, false);
    if (own) return referenceInBook(version, own, split);
  }

  const parsed = parseBibleReference(input);
  if (parsed) {
    const bookId = parsed.ordem - 1;
    if (!versionCode) {
      return { bookId, chapter: parsed.capitulo, verse: hasVerse(input) ? parsed.versiculoInicial : undefined };
    }
    const book = getBook(versionCode, bookId);
    if (!book) return { bookId, chapter: parsed.capitulo, bookMissing: true };
    if (parsed.capitulo > book.chapters.length) return null;
    const verse = hasVerse(input) ? parsed.versiculoInicial : undefined;
    if (verse && !book.chapters[parsed.capitulo - 1]?.verses.some((item) => item.number === verse)) return null;
    return { bookId, chapter: parsed.capitulo, verse };
  }

  if (version && split) {
    const own = findVersionBook(version, split.livroBruto, true);
    if (own) return referenceInBook(version, own, split);
  }

  // Book name alone ("Gên", "1 João", "Genesis") opens chapter 1.
  if (/\d\s*[:.]/.test(input)) return null;
  const alone = version ? (findVersionBook(version, input, false) ?? findVersionBook(version, input, true)) : undefined;
  if (alone) return { bookId: alone.id, chapter: 1 };
  const book = findBook(input);
  if (!book) return null;
  if (version && book.order - 1 >= version.books.length) return { bookId: book.order - 1, chapter: 1, bookMissing: true };
  return { bookId: book.order - 1, chapter: 1 };
}

/** The shared parser defaults to verse 1; detect whether the user actually typed a verse. */
function hasVerse(input: string): boolean {
  return /\d\s*[:.]\s*\d/.test(input) || /[A-Za-zÀ-ÿ]\s+\d+\s+\d+\s*$/.test(input);
}
