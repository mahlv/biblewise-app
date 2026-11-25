import { requireOptionalNativeModule } from 'expo';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from '../locales/de.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import it from '../locales/it.json';
import no from '../locales/no.json';
import ptBR from '../locales/pt-BR.json';
import ru from '../locales/ru.json';

/** UI languages (not Bible versions: the Bible text follows the selected version). */
export const SUPPORTED_LANGUAGES = [
  { code: 'pt-BR', nativeName: 'Português' },
  { code: 'en', nativeName: 'English' },
  { code: 'es', nativeName: 'Español' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'no', nativeName: 'Norsk' },
  { code: 'ru', nativeName: 'Русский' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/** Used for keys missing in a language and when the device language is not one of the supported ones. */
export const FALLBACK_LANGUAGE: LanguageCode = 'en';
const STORAGE_KEY = 'user-language';

const isSupported = (code: unknown): code is LanguageCode => SUPPORTED_LANGUAGES.some((language) => language.code === code);

/** Loaded on demand so importing this module never needs the AsyncStorage native module (tests, early boot). */
function storage(): typeof import('@react-native-async-storage/async-storage').default {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@react-native-async-storage/async-storage') as typeof import('@react-native-async-storage/async-storage')).default;
}

/** Maps a BCP-47 tag ("pt-PT", "nb-NO", "en-US") to one of the supported UI languages, or null. */
export function mapLanguageTag(tag: string | null | undefined): LanguageCode | null {
  const base = tag?.toLowerCase().split(/[-_]/)[0];
  if (!base) return null;
  if (base === 'pt') return 'pt-BR';
  if (base === 'nb' || base === 'nn' || base === 'no') return 'no';
  return isSupported(base) ? base : null;
}

/** The device's preferred language among the supported ones (first match wins), else the fallback. */
export function detectDeviceLanguage(): LanguageCode {
  try {
    // Builds made before expo-localization was added lack the native module: keep the fallback.
    if (requireOptionalNativeModule('ExpoLocalization')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getLocales } = require('expo-localization') as typeof import('expo-localization');
      for (const locale of getLocales()) {
        const mapped = mapLanguageTag(locale.languageTag) ?? mapLanguageTag(locale.languageCode);
        if (mapped) return mapped;
      }
    }
  } catch {
    // Fall through to the default.
  }
  return FALLBACK_LANGUAGE;
}

void i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    it: { translation: it },
    de: { translation: de },
    no: { translation: no },
    ru: { translation: ru },
  },
  lng: detectDeviceLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  // React Native escapes nothing; resources are bundled, so init is synchronous.
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** BCP-47 tags for `Intl`/`toLocaleDateString` (Norwegian is "nb" there). */
const LOCALE_TAGS: Record<LanguageCode, string> = {
  'pt-BR': 'pt-BR',
  en: 'en-US',
  es: 'es',
  fr: 'fr',
  it: 'it',
  de: 'de',
  no: 'nb-NO',
  ru: 'ru',
};

/** Locale tag of the UI language, for formatting dates and numbers. */
export function localeTag(): string {
  return LOCALE_TAGS[currentLanguage()];
}

/** Language the UI is showing right now. */
export function currentLanguage(): LanguageCode {
  return mapLanguageTag(i18n.language) ?? FALLBACK_LANGUAGE;
}

/** Switches the whole UI instantly (components using `useTranslation` re-render) and remembers the choice. */
export async function changeLanguage(code: LanguageCode): Promise<void> {
  await i18n.changeLanguage(code);
  try {
    await storage().setItem(STORAGE_KEY, code);
  } catch {
    // Not being able to remember the choice must not break the switch.
  }
}

/** Applies the language saved by the user, if any (call once at app start). Resolves with the language in use. */
export async function loadLanguagePreference(): Promise<LanguageCode> {
  try {
    const saved = await storage().getItem(STORAGE_KEY);
    if (isSupported(saved) && saved !== currentLanguage()) await i18n.changeLanguage(saved);
  } catch {
    // Keep the detected language.
  }
  return currentLanguage();
}

export { i18n };
export default i18n;
