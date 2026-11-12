import {
  clampPosition,
  ensureVersionLoaded,
  getBook,
  getChapter,
  isVersionLoaded,
  loadAllVersions,
  loadVersion,
  parseReference,
} from '../lib/bibleLoader';
import { getDailyVerse } from '../lib/dailyVerse';
import { languageName } from '../lib/bibleVersions';

// Asset versions are read through expo-asset + File: here the "asset" is the file path itself.
jest.mock('expo-asset', () => ({
  Asset: { fromModule: (path: string) => ({ downloadAsync: async () => undefined, localUri: path, uri: path }) },
}));
jest.mock('expo-file-system', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as { readFileSync(path: string, encoding: string): string };
  return {
    File: jest.fn().mockImplementation((uri: string) => ({
      text: () => Promise.resolve(fs.readFileSync(uri, 'utf8')),
    })),
  };
});

const NEW_CODES = [
  'JFA-PT', 'KJV-EN', 'ASV-EN', 'WEB-EN', 'DBY-EN', 'YLT-EN', 'DRC-EN', 'JPS-EN', 'RV1909-ES', 'LSG-FR', 'JND-FR',
  'RIV-IT', 'DIO-IT', 'LUT-DE', 'NO1930-NO', 'RST-RU', 'SVD-AR',
];

describe('multilingual Bible versions', () => {
  beforeAll(async () => {
    // Keep each version loaded only as long as needed (the cache holds three asset versions).
    await ensureVersionLoaded('KJV-EN');
  });

  it('registers the two Portuguese inline versions plus 17 asset versions', () => {
    const codes = loadAllVersions().map((version) => version.code);
    expect(codes.slice(0, 2)).toEqual(['TB-PT', 'BLIVRE-PT']);
    expect(codes).toHaveLength(19);
    expect(new Set(codes)).toEqual(new Set(['TB-PT', 'BLIVRE-PT', ...NEW_CODES]));
  });

  it('names languages in Portuguese', () => {
    expect(languageName('pt-BR')).toBe('Português');
    expect(languageName('nb')).toBe('Norueguês');
    expect(languageName('ar')).toBe('Árabe');
  });

  it('falls back to the default version when an asset version is not loaded yet', () => {
    expect(isVersionLoaded('SVD-AR')).toBe(false);
    expect(loadVersion('SVD-AR').code).toBe('TB-PT');
  });

  it('loads KJV with the same 66-book model and verse text', async () => {
    expect(isVersionLoaded('KJV-EN')).toBe(true);
    const version = loadVersion('KJV-EN');
    expect(version.books).toHaveLength(66);
    expect(version.books[0]).toMatchObject({ name: 'Genesis', testament: 'AT' });
    expect(version.books[65]).toMatchObject({ name: 'Revelation', testament: 'NT' });
    expect(getChapter('KJV-EN', 0, 1)?.verses[0]?.text).toContain('In the beginning God created');
    expect(getChapter('KJV-EN', 42, 3)?.verses[15]).toMatchObject({ number: 16, text: expect.stringContaining('For God so loved the world') });
  });

  it('reads Norwegian with Norwegian book names', async () => {
    await ensureVersionLoaded('NO1930-NO');
    expect(getBook('NO1930-NO', 0)?.name).toBe('1 Mosebok');
    expect(getBook('NO1930-NO', 65)?.name).toBe('Johannes’ Åpenbaring');
  });

  it('keeps real verse numbers when the source skips them (Russian Psalm titles)', async () => {
    await ensureVersionLoaded('RST-RU');
    // Psalm 3: the title is verse 1 in the source and is missing from the text, so the first shown verse is 2.
    expect(getChapter('RST-RU', 18, 3)?.verses[0]?.number).toBe(2);
    expect(getBook('RST-RU', 0)?.name).toBe('Бытие');
  });

  it('adds the deuterocanon after the Old Testament in Douay-Rheims', async () => {
    await ensureVersionLoaded('DRC-EN');
    const version = loadVersion('DRC-EN');
    expect(version.books).toHaveLength(73);
    expect(version.books[66]).toMatchObject({ id: 66, name: 'Tobias', testament: 'AT' });
    expect(version.numbering).toBe('vulgate');
  });

  it('treats JPS-1917 as Old Testament only', async () => {
    await ensureVersionLoaded('JPS-EN');
    const version = loadVersion('JPS-EN');
    expect(version.books).toHaveLength(39);
    expect(version.scope).toBe('ot');
    // Malachi has 3 chapters in the Hebrew division used by JPS.
    expect(clampPosition('JPS-EN', { bookId: 42, chapter: 3 })).toEqual({ bookId: 38, chapter: 3 });
  });

  it('exposes Arabic as right-to-left', () => {
    expect(loadAllVersions().find((version) => version.code === 'SVD-AR')?.direction).toBe('rtl');
  });
});

describe('references typed with a version’s own book names', () => {
  beforeAll(async () => {
    await Promise.all(['KJV-EN', 'LSG-FR', 'JPS-EN'].map((code) => ensureVersionLoaded(code)));
  });

  it('accepts English names in KJV and French names in LSG', () => {
    expect(parseReference('John 3:16', 'KJV-EN')).toEqual({ bookId: 42, chapter: 3, verse: 16 });
    expect(parseReference('1 Corinthians 13', 'KJV-EN')).toEqual({ bookId: 45, chapter: 13, verse: undefined });
    expect(parseReference('Genesis', 'KJV-EN')).toEqual({ bookId: 0, chapter: 1 });
    expect(parseReference('Jean 3:16', 'LSG-FR')).toEqual({ bookId: 42, chapter: 3, verse: 16 });
  });

  it('still accepts Portuguese names in other versions', () => {
    expect(parseReference('João 3:16', 'KJV-EN')).toEqual({ bookId: 42, chapter: 3, verse: 16 });
    expect(parseReference('Salmos 23', 'LSG-FR')).toEqual({ bookId: 18, chapter: 23, verse: undefined });
  });

  it('rejects chapters and verses that do not exist', () => {
    expect(parseReference('John 99', 'KJV-EN')).toBeNull();
    expect(parseReference('John 3:999', 'KJV-EN')).toBeNull();
    expect(parseReference('xyzzy 1', 'KJV-EN')).toBeNull();
  });

  it('flags books missing from the version (New Testament in an Old Testament version)', () => {
    expect(parseReference('João 3:16', 'JPS-EN')).toMatchObject({ bookMissing: true });
    // An English name the version does not know is simply not found.
    expect(parseReference('John 3:16', 'JPS-EN')).toBeNull();
    expect(parseReference('Isaiah 53', 'JPS-EN')).toEqual({ bookId: 22, chapter: 53, verse: undefined });
  });

  it('keeps the Portuguese disambiguation of "Jo" (João) in Portuguese versions', () => {
    expect(parseReference('Jo 3:16', 'TB-PT')).toEqual({ bookId: 42, chapter: 3, verse: 16 });
  });
});

describe('daily verse across versions', () => {
  const date = new Date(2026, 0, 1);

  it('returns text in the selected language', async () => {
    await ensureVersionLoaded('KJV-EN');
    const verse = getDailyVerse('KJV-EN', date);
    expect(verse).not.toBeNull();
    expect(verse?.reference).toMatch(/^[A-Za-z0-9 ]+ \d+:\d+/);
  });

  it('never returns Psalms for the Vulgate-numbered Douay-Rheims', async () => {
    await ensureVersionLoaded('DRC-EN');
    for (let day = 0; day < 60; day += 1) {
      const verse = getDailyVerse('DRC-EN', new Date(2026, 0, 1 + day));
      expect(verse?.key.startsWith('18:')).toBe(false);
    }
  });
});
