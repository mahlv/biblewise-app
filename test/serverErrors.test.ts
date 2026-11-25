import { ConvexError } from 'convex/values';
import i18n, { changeLanguage } from '../lib/i18n';
import { recordingErrorMessage, serverErrorMessage } from '../lib/serverError';
import {
  appError,
  isSummaryLanguage,
  PIPELINE_ERROR_CODES,
  SERVER_ERROR_CODES,
  SUMMARY_LANGUAGES,
} from '../lib/serverErrors';
import { SUPPORTED_LANGUAGES } from '../lib/i18n';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) },
}));

describe('server error codes', () => {
  afterEach(async () => {
    await changeLanguage('pt-BR');
  });

  it('has a translation for every code in every language', () => {
    for (const { code: language } of SUPPORTED_LANGUAGES) {
      for (const code of SERVER_ERROR_CODES) {
        expect(i18n.exists(`serverErrors.${code}`, { lng: language, fallbackLng: false })).toBe(true);
      }
      for (const code of PIPELINE_ERROR_CODES) {
        expect(i18n.exists(`serverErrors.pipeline.${code}`, { lng: language, fallbackLng: false })).toBe(true);
      }
    }
  });

  it('translates a ConvexError into the app language, with its limit', async () => {
    const error = appError('titleTooLong', { max: 80 });
    expect(serverErrorMessage(error, 'fallback')).toBe('O título pode ter até 80 caracteres.');
    await changeLanguage('en');
    expect(serverErrorMessage(error, 'fallback')).toBe('The title can be up to 80 characters.');
  });

  it('uses the fallback for unknown codes and plain errors', () => {
    expect(serverErrorMessage(new ConvexError({ code: 'nope' }), 'fallback')).toBe('fallback');
    expect(serverErrorMessage(new Error('Uncaught Error: x'), 'fallback')).toBe('fallback');
    expect(serverErrorMessage(undefined, 'fallback')).toBe('fallback');
  });

  it('translates stored recording failures and keeps old Portuguese text', async () => {
    await changeLanguage('en');
    expect(recordingErrorMessage('noSpeech', 'fallback')).toBe("We didn't detect any speech in the recording.");
    expect(recordingErrorMessage('Não detectamos fala na gravação.', 'fallback')).toBe('Não detectamos fala na gravação.');
    expect(recordingErrorMessage(undefined, 'fallback')).toBe('fallback');
  });

  it('writes the AI summary in the languages the app supports', () => {
    for (const { code } of SUPPORTED_LANGUAGES) expect(isSummaryLanguage(code)).toBe(true);
    expect(Object.keys(SUMMARY_LANGUAGES)).toHaveLength(SUPPORTED_LANGUAGES.length);
    expect(isSummaryLanguage('ja')).toBe(false);
  });
});
