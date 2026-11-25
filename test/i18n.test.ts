import i18n, { changeLanguage, FALLBACK_LANGUAGE, loadLanguagePreference, mapLanguageTag, SUPPORTED_LANGUAGES } from '../lib/i18n';

let mockDeviceLocales: { languageTag: string; languageCode: string | null }[] = [];
jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  requireOptionalNativeModule: () => ({}),
}));
jest.mock('expo-localization', () => ({ getLocales: () => mockDeviceLocales }));

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => Promise.resolve(mockStore.get(key) ?? null),
    setItem: (key: string, value: string) => {
      mockStore.set(key, value);
      return Promise.resolve();
    },
  },
}));

// Jest runs from the project root.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
const readLocale = (code: string): Record<string, unknown> => JSON.parse(fs.readFileSync(`locales/${code}.json`, 'utf8'));

/** "a.b.c" -> value, for every string leaf. */
function flatten(node: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(node)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[full] = value;
    else Object.assign(out, flatten(value as Record<string, unknown>, full));
  }
  return out;
}

const placeholders = (text: string): string[] => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]!).sort();
/** i18next plural suffixes; the base key is the same name without the suffix. */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

describe('language mapping', () => {
  it('maps device tags to supported languages', () => {
    expect(mapLanguageTag('pt-PT')).toBe('pt-BR');
    expect(mapLanguageTag('pt')).toBe('pt-BR');
    expect(mapLanguageTag('nb-NO')).toBe('no');
    expect(mapLanguageTag('nn')).toBe('no');
    expect(mapLanguageTag('en-US')).toBe('en');
    expect(mapLanguageTag('ar-EG')).toBeNull();
    expect(mapLanguageTag('ja-JP')).toBeNull();
    expect(mapLanguageTag(undefined)).toBeNull();
  });

  it('offers the eight supported languages', () => {
    expect(SUPPORTED_LANGUAGES.map((language) => language.code)).toEqual(['pt-BR', 'en', 'es', 'fr', 'it', 'de', 'no', 'ru']);
  });
});

/** i18n starts with the device language, so it is re-evaluated with the mocked locale module. */
function detectWith(locales: typeof mockDeviceLocales) {
  mockDeviceLocales = locales;
  jest.resetModules();
  return (require('../lib/i18n') as typeof import('../lib/i18n')).detectDeviceLanguage();
}

describe('device language', () => {
  it('uses the first device language that is supported', () => {
    expect(detectWith([{ languageTag: 'ja-JP', languageCode: 'ja' }, { languageTag: 'nb-NO', languageCode: 'nb' }])).toBe('no');
    expect(detectWith([{ languageTag: 'pt-PT', languageCode: 'pt' }])).toBe('pt-BR');
  });

  it('falls back to English when no device language is supported', () => {
    expect(FALLBACK_LANGUAGE).toBe('en');
    expect(detectWith([{ languageTag: 'ja-JP', languageCode: 'ja' }, { languageTag: 'ko-KR', languageCode: 'ko' }])).toBe('en');
    expect(i18n.options.fallbackLng).toEqual(['en']);
  });
});

describe('language switching', () => {
  beforeEach(async () => {
    mockStore.clear();
    await i18n.changeLanguage('pt-BR');
  });

  it('changes every translated string instantly and remembers the choice', async () => {
    expect(i18n.t('tabs.diary')).toBe('Diário');
    await changeLanguage('en');
    expect(i18n.t('tabs.diary')).toBe('Journal');
    expect(mockStore.get('user-language')).toBe('en');
  });

  it('restores the saved language at the next start', async () => {
    mockStore.set('user-language', 'de');
    expect(await loadLanguagePreference()).toBe('de');
    expect(i18n.t('common.save')).toBe('Speichern');
  });

  it('ignores a saved value that is not a supported language', async () => {
    mockStore.set('user-language', 'xx');
    expect(await loadLanguagePreference()).toBe('pt-BR');
  });

  it('falls back to English for a key missing in a language', async () => {
    i18n.addResource('en', 'translation', 'test.onlyInEnglish', 'only in English');
    i18n.addResource('pt-BR', 'translation', 'test.onlyInEnglish', 'só em português');
    await i18n.changeLanguage('de');
    expect(i18n.t('test.onlyInEnglish' as never)).toBe('only in English');
    // pt-BR has its own text, so it does not borrow English.
    await i18n.changeLanguage('pt-BR');
    expect(i18n.t('test.onlyInEnglish' as never)).toBe('só em português');
  });
});

describe('translation files', () => {
  const source = flatten(readLocale('pt-BR'));
  const others = SUPPORTED_LANGUAGES.map((language) => language.code).filter((code) => code !== 'pt-BR');

  it.each(others)('%s has the same keys as pt-BR (plural forms may differ per language)', (code) => {
    const strip = (keys: string[]) => [...new Set(keys.map((key) => key.replace(PLURAL_SUFFIX, '')))].sort();
    expect(strip(Object.keys(flatten(readLocale(code))))).toEqual(strip(Object.keys(source)));
  });

  it.each(others)('%s keeps the {{placeholders}} of pt-BR and has no empty text', (code) => {
    const translated = flatten(readLocale(code));
    for (const [key, text] of Object.entries(translated)) {
      expect(text.trim()).not.toBe('');
      const sourceKey = source[key] !== undefined ? key : Object.keys(source).find((candidate) => candidate.replace(PLURAL_SUFFIX, '') === key.replace(PLURAL_SUFFIX, ''));
      if (sourceKey) expect(placeholders(text)).toEqual(placeholders(source[sourceKey]!));
    }
  });
});
