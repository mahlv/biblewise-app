import i18n from './i18n';
import type { PrayerType } from './prayerCategories';

export interface NotificationParts {
  type: 'like' | 'comment';
  prayerType: PrayerType;
  /** Name of whoever acted; empty/missing becomes "Someone" (in the app language). */
  actorName?: string;
  prayerTitle: string;
  previewText?: string;
}

const TITLE_LIMIT = 60;

/** Shortens text to `limit` characters, ending with an ellipsis. */
function truncate(text: string, limit: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > limit ? `${clean.slice(0, limit - 1).trimEnd()}…` : clean;
}

/**
 * Text of a notification row: a headline ("Maria curtiu seu pedido") and a detail line
 * (the comment preview, or the post title for likes).
 */
export function notificationMessage(parts: NotificationParts): { headline: string; detail: string } {
  const actor = parts.actorName?.trim() || i18n.t('notifications.someone');
  const testimony = parts.prayerType === 'testimony';

  if (parts.type === 'comment') {
    const preview = parts.previewText ? truncate(parts.previewText, 100) : '';
    const headline = i18n.t(testimony ? 'notifications.commentTestimony' : 'notifications.commentRequest', { actor });
    return { headline, detail: preview ? `“${preview}”` : `“${truncate(parts.prayerTitle, TITLE_LIMIT)}”` };
  }
  return { headline: i18n.t(testimony ? 'notifications.likeTestimony' : 'notifications.likeRequest', { actor }), detail: `“${truncate(parts.prayerTitle, TITLE_LIMIT)}”` };
}
