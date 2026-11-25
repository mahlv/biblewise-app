import { ConvexError } from 'convex/values';
import i18n from './i18n';
import { isPipelineErrorCode, isServerErrorData } from './serverErrors';

/**
 * Text for an error thrown by a Convex function, in the app language.
 * Anything without a known code (network failure, old server) gets `fallback`.
 */
export function serverErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ConvexError && isServerErrorData(error.data)) {
    return i18n.t(`serverErrors.${error.data.code}`, { max: error.data.max });
  }
  return fallback;
}

/**
 * Failure reason stored on a recording. New recordings store a code (translated here);
 * older ones stored Portuguese text, which is shown as it is.
 */
export function recordingErrorMessage(stored: string | undefined, fallback: string): string {
  if (!stored) return fallback;
  return isPipelineErrorCode(stored) ? i18n.t(`serverErrors.pipeline.${stored}`) : stored;
}
