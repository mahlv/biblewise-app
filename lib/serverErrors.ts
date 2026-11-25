/**
 * Error codes shared by the Convex backend and the app (no React Native imports).
 *
 * The server throws `appError(code)`; the app turns the code into text with i18n
 * (`serverErrors.<code>` in the locale files), so messages follow the app language.
 */
import { ConvexError } from 'convex/values';

export const SERVER_ERROR_CODES = [
  // Not found
  'userNotFound',
  'prayerNotFound',
  'commentNotFound',
  'notificationNotFound',
  'recordingNotFound',
  'audioNotFound',
  'imageNotFound',
  // Prayer wall
  'titleRequired',
  'titleTooLong',
  'messageRequired',
  'messageTooLong',
  'scriptureTooLong',
  'commentRequired',
  'commentTooLong',
  'dailyPostLimit',
  'dailyCommentLimit',
  'reportOwnPrayer',
  'reportOwnComment',
  // Recordings
  'dailyRecordingLimit',
  'recordingDurationInvalid',
  'audioTooLarge',
  'meetingTypeInvalid',
  // Profile
  'signInToEditProfile',
  'emailInvalid',
  'imageTooLarge',
] as const;

/** Failure reasons of the recording pipeline; stored in `recordings.error` and shown by the app. */
export const PIPELINE_ERROR_CODES = ['transcribeFailed', 'noSpeech', 'summaryFailed', 'notConfigured', 'unexpected'] as const;

export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[number];
export type PipelineErrorCode = (typeof PIPELINE_ERROR_CODES)[number];

// A type alias (not an interface) so it satisfies Convex's `Value` constraint.
export type ServerErrorData = {
  code: ServerErrorCode;
  /** Limit shown in "up to {{max}} characters" style messages. */
  max?: number;
};

/** Error with a stable code. Unlike plain `Error`, its data reaches the client in production too. */
export function appError(code: ServerErrorCode, params: { max?: number } = {}): ConvexError<ServerErrorData> {
  return new ConvexError<ServerErrorData>({ code, ...params });
}

export function isServerErrorData(value: unknown): value is ServerErrorData {
  if (typeof value !== 'object' || value === null) return false;
  const { code } = value as { code?: unknown };
  return typeof code === 'string' && (SERVER_ERROR_CODES as readonly string[]).includes(code);
}

export function isPipelineErrorCode(value: unknown): value is PipelineErrorCode {
  return typeof value === 'string' && (PIPELINE_ERROR_CODES as readonly string[]).includes(value);
}

/** Languages the AI summary can be written in (app language code -> name used in the prompt). */
export const SUMMARY_LANGUAGES = {
  'pt-BR': 'Brazilian Portuguese',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  de: 'German',
  no: 'Norwegian (Bokmål)',
  ru: 'Russian',
} as const;

export type SummaryLanguage = keyof typeof SUMMARY_LANGUAGES;

/** Used for recordings made before the language was stored (they were always Portuguese). */
export const DEFAULT_SUMMARY_LANGUAGE: SummaryLanguage = 'pt-BR';

export function isSummaryLanguage(value: unknown): value is SummaryLanguage {
  return typeof value === 'string' && value in SUMMARY_LANGUAGES;
}
