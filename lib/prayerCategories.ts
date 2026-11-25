/**
 * Prayer wall options shared by the app and the Convex backend.
 *
 * Plain TypeScript (no React Native) on purpose: `convex/schema.ts` builds its validators from
 * these lists, so what the form offers and what the server accepts can never drift apart.
 */

export const PRAYER_TYPES = ['request', 'testimony'] as const;
export type PrayerType = (typeof PRAYER_TYPES)[number];

/** Stored (and shown) as these uppercase labels. */
export const PRAYER_CATEGORIES = [
  'FAMÍLIA & SAÚDE',
  'VIDA PROFISSIONAL',
  'PAZ & DIREÇÃO',
  'RECONCILIAÇÃO',
  'FINANÇAS',
  'GRATIDÃO',
  'FÉ & CRESCIMENTO',
  'OUTROS',
] as const;
export type PrayerCategory = (typeof PRAYER_CATEGORIES)[number];

/** Tag colors per category (soft background + readable text). */
export const PRAYER_CATEGORY_COLORS: Record<PrayerCategory, { background: string; text: string }> = {
  'FAMÍLIA & SAÚDE': { background: '#E1EBFF', text: '#0051D4' },
  'VIDA PROFISSIONAL': { background: '#E1EBFF', text: '#0051D4' },
  'PAZ & DIREÇÃO': { background: '#F7EADB', text: '#7A5A2A' },
  'RECONCILIAÇÃO': { background: '#FFE3E8', text: '#B90039' },
  'FINANÇAS': { background: '#E4F2DC', text: '#376725' },
  'GRATIDÃO': { background: '#E4F2DC', text: '#376725' },
  'FÉ & CRESCIMENTO': { background: '#EADFFF', text: '#6B3FD1' },
  'OUTROS': { background: '#F1E8E5', text: '#5C3F41' },
};

/** Limits enforced by the server and used by the form. */
export const PRAYER_LIMITS = {
  title: 80,
  content: 1000,
  scriptureReference: 40,
  scriptureText: 400,
  /** Posts a user can publish in 24 hours. */
  dailyPosts: 5,
  /** Distinct reports that hide a post automatically. */
  reportsToHide: 3,
  /** Counts in the stats cards stop here (shown as "200+"). */
  statsCap: 200,
  /** Comments: max length, and how many a user can write in 24 hours. */
  comment: 500,
  dailyComments: 30,
  /** Characters of a comment kept in the notification preview. */
  notificationPreview: 100,
  /** Unread notifications are counted up to here (shown as "99+"). */
  unreadCap: 100,
} as const;

/** Name stored for anonymous posts; the app shows its translation instead (see `lib/prayerLabels.ts`). */
export const ANONYMOUS_AUTHOR_NAME = 'Irmão em Cristo';

export function isPrayerType(value: unknown): value is PrayerType {
  return typeof value === 'string' && (PRAYER_TYPES as readonly string[]).includes(value);
}

export function isPrayerCategory(value: unknown): value is PrayerCategory {
  return typeof value === 'string' && (PRAYER_CATEGORIES as readonly string[]).includes(value);
}
