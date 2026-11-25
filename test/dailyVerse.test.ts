import { ensureVersionLoaded } from '../lib/bibleLoader';
import { endsSentence, getDailyVerse, startsSentence } from '../lib/dailyVerse';

jest.mock('expo-asset', () => ({
  Asset: { fromModule: (path: string) => ({ downloadAsync: () => Promise.resolve(undefined), localUri: path, uri: path }) },
}));
jest.mock('expo-file-system', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  return {
    File: jest.fn().mockImplementation((uri: string) => ({
      text: () => Promise.resolve(fs.readFileSync(uri, 'utf8')),
    })),
  };
});

describe('sentence helpers', () => {
  it('detects sentence ends, ignoring closing quotes', () => {
    expect(endsSentence('Tudo posso naquele que me fortalece.')).toBe(true);
    expect(endsSentence('disse: “Eu sou.”')).toBe(true);
    expect(endsSentence('Quem é como Deus?')).toBe(true);
    expect(endsSentence('ele fará,')).toBe(false);
    expect(endsSentence('de Cristo Jesus;')).toBe(false);
    expect(endsSentence('sem pontuação')).toBe(false);
  });

  it('detects mid-sentence starts by a lowercase first letter', () => {
    expect(startsSentence('Pois Deus não nos deu')).toBe(true);
    expect(startsSentence('“Eu sei os planos”')).toBe(true);
    expect(startsSentence('não temas, porque eu sou contigo')).toBe(false);
    expect(startsSentence('و كان')).toBe(true);
  });
});

describe('daily verse completeness', () => {
  const VERSIONS = ['TB-PT', 'BLIVRE-PT', 'JFA-PT', 'KJV-EN', 'RV1909-ES'];

  it.each(VERSIONS)('shows whole sentences on every day for %s', async (code) => {
    await ensureVersionLoaded(code);
    const keys = new Set<string>();
    const problems: string[] = [];

    for (let day = 0; day < 42; day += 1) {
      const verse = getDailyVerse(code, new Date(2026, 0, 1 + day));
      if (!verse) {
        problems.push(`day ${day}: none`);
        continue;
      }
      keys.add(verse.key);
      if (!startsSentence(verse.text)) problems.push(`${verse.reference} starts mid-sentence: ${verse.text.slice(0, 40)}`);
      if (!endsSentence(verse.text)) problems.push(`${verse.reference} ends mid-sentence: ${verse.text.slice(-40)}`);
      if (verse.text.length > 220) problems.push(`${verse.reference} too long (${verse.text.length})`);
    }

    expect(problems).toEqual([]);
    // Skipping incomplete passages must not collapse the rotation into a handful of verses.
    expect(keys.size).toBeGreaterThanOrEqual(30);
  });

  it('completes a sentence by growing the passage, keeping the curated key', async () => {
    await ensureVersionLoaded('TB-PT');
    const all = Array.from({ length: 42 }, (_, day) => getDailyVerse('TB-PT', new Date(2026, 0, 1 + day)));
    // Romanos 5:8 starts with "mas Deus prova": it grows back to verse 7 and the reference follows.
    const romans = all.find((verse) => verse?.key === '44:5:8-8');
    expect(romans?.reference).toBe('Romanos 5:7–8');
  });

  it('uses every curated passage once per cycle (nothing is skipped for being too long)', async () => {
    for (const code of ['TB-PT', 'BLIVRE-PT']) {
      await ensureVersionLoaded(code);
      const keys = new Set(Array.from({ length: 42 }, (_, day) => getDailyVerse(code, new Date(2026, 0, 1 + day))?.key));
      expect(keys.size).toBe(42);
    }
  });
});
