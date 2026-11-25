// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');

type NativeLocale = { ios: Record<string, string>; android: Record<string, string> };

const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8')) as { expo: { locales: Record<string, string> } };
const read = (file: string): NativeLocale => JSON.parse(fs.readFileSync(file, 'utf8')) as NativeLocale;

const SWIFT_SOURCE = fs.readFileSync('targets/widget/QuoteWidget.swift', 'utf8');

describe('native (non in-app) translations', () => {
  const entries = Object.entries(appConfig.expo.locales);

  it('registers the seven non-English languages', () => {
    expect(entries.map(([lang]) => lang).sort()).toEqual(['de', 'es', 'fr', 'it', 'nb', 'pt', 'ru']);
  });

  it('gives every language the same keys, with no characters that break the .strings/.xml output', () => {
    const base = read(entries[0]![1]);
    for (const [, file] of entries) {
      const locale = read(file);
      expect(Object.keys(locale.ios).sort()).toEqual(Object.keys(base.ios).sort());
      expect(Object.keys(locale.android).sort()).toEqual(Object.keys(base.android).sort());
      for (const value of [...Object.values(locale.ios), ...Object.values(locale.android)]) {
        expect(value.trim()).not.toBe('');
        expect(value).not.toMatch(/["\\\n]/);
      }
    }
  });

  it('translates every English text used by the iOS widget in every language', () => {
    const keys = ['Next quote', 'Open the Bible', 'Widget paused', 'Tap to activate', 'Inspiring verses and quotes, refreshed twice a day.'];
    for (const key of keys) expect(SWIFT_SOURCE).toContain(`"${key}"`);
    for (const [lang] of entries) {
      const strings = fs.readFileSync(`targets/widget/${lang}.lproj/Localizable.strings`, 'utf8');
      for (const key of keys) expect(strings).toContain(`"${key}" = "`);
    }
  });
});
