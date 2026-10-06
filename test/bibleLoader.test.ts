import { clampPosition, getAdjacentChapter, getBook, getChapter, loadAllVersions, loadVersion, parseReference } from '../lib/bibleLoader';
import { BIBLE_THEMES, getTheme } from '../constants/bibleThemes';

describe('bibleLoader', () => {
  it('lists the registered versions without loading them', () => {
    expect(loadAllVersions().map((version) => version.code)).toEqual(['TB-PT', 'BLIVRE-PT']);
  });

  it('normalizes a version into 66 books', () => {
    const version = loadVersion('TB-PT');
    expect(version.books).toHaveLength(66);
    expect(version.books[0]).toMatchObject({ id: 0, name: 'Gênesis', testament: 'AT' });
    expect(version.books[65]).toMatchObject({ name: 'Apocalipse', testament: 'NT' });
  });

  it('reads chapters and verses', () => {
    expect(getBook('TB-PT', 0)?.chapters).toHaveLength(50);
    expect(getChapter('TB-PT', 0, 1)?.verses[0]).toEqual({ number: 1, text: expect.stringContaining('No princípio') });
    expect(getChapter('BLIVRE-PT', 42, 3)?.verses[15]?.text).toContain('Deus amou');
  });

  it('navigates across book boundaries and stops at the edges', () => {
    expect(getAdjacentChapter('TB-PT', { bookId: 0, chapter: 1 }, 'previous')).toBeNull();
    expect(getAdjacentChapter('TB-PT', { bookId: 0, chapter: 50 }, 'next')).toEqual({ bookId: 1, chapter: 1 });
    expect(getAdjacentChapter('TB-PT', { bookId: 1, chapter: 1 }, 'previous')).toEqual({ bookId: 0, chapter: 50 });
    const last = loadVersion('TB-PT').books[65]!;
    expect(getAdjacentChapter('TB-PT', { bookId: 65, chapter: last.chapters.length }, 'next')).toBeNull();
  });

  it('clamps out-of-range positions', () => {
    expect(clampPosition('TB-PT', { bookId: 999, chapter: 999 })).toEqual({ bookId: 65, chapter: 22 });
    expect(clampPosition('TB-PT', { bookId: 0, chapter: 0 })).toEqual({ bookId: 0, chapter: 1 });
  });

  it('parses references', () => {
    expect(parseReference('João 3:16', 'TB-PT')).toEqual({ bookId: 42, chapter: 3, verse: 16 });
    expect(parseReference('Gênesis 1', 'TB-PT')).toEqual({ bookId: 0, chapter: 1, verse: undefined });
    expect(parseReference('Gên', 'TB-PT')).toEqual({ bookId: 0, chapter: 1 });
    expect(parseReference('Gênesis 99', 'TB-PT')).toBeNull();
    expect(parseReference('Gênesis 1:999', 'TB-PT')).toBeNull();
    expect(parseReference('xyzzy', 'TB-PT')).toBeNull();
  });
});

describe('bibleThemes', () => {
  it('has six themes with unique ids and exactly one free', () => {
    expect(BIBLE_THEMES).toHaveLength(6);
    expect(new Set(BIBLE_THEMES.map((theme) => theme.id)).size).toBe(6);
    expect(BIBLE_THEMES.filter((theme) => !theme.isPremium).map((theme) => theme.id)).toEqual(['alabaster']);
  });

  it('falls back to the default theme for unknown ids', () => {
    expect(getTheme('nope').id).toBe('alabaster');
    expect(getTheme(null).id).toBe('alabaster');
  });
});
