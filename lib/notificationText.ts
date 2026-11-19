import type { PrayerType } from './prayerCategories';

export interface NotificationParts {
  type: 'like' | 'comment';
  prayerType: PrayerType;
  /** Name of whoever acted; empty/missing becomes "Alguém". */
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
  const actor = parts.actorName?.trim() || 'Alguém';
  const noun = parts.prayerType === 'testimony' ? 'testemunho' : 'pedido';

  if (parts.type === 'comment') {
    const preview = parts.previewText ? truncate(parts.previewText, 100) : '';
    return { headline: `${actor} comentou no seu ${noun}`, detail: preview ? `“${preview}”` : `“${truncate(parts.prayerTitle, TITLE_LIMIT)}”` };
  }
  return { headline: `${actor} curtiu seu ${noun}`, detail: `“${truncate(parts.prayerTitle, TITLE_LIMIT)}”` };
}
