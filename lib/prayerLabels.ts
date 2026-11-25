import i18n from './i18n';
import type { PrayerCategory, PrayerType } from './prayerCategories';

/**
 * Categories are stored (and validated by Convex) as Portuguese labels, so the stored value never
 * changes; this maps each one to its translation key for display.
 */
const CATEGORY_KEYS = {
  'FAMÍLIA & SAÚDE': 'familyHealth',
  'VIDA PROFISSIONAL': 'career',
  'PAZ & DIREÇÃO': 'peaceDirection',
  RECONCILIAÇÃO: 'reconciliation',
  FINANÇAS: 'finances',
  GRATIDÃO: 'gratitude',
  'FÉ & CRESCIMENTO': 'faithGrowth',
  OUTROS: 'other',
} as const satisfies Record<PrayerCategory, string>;

/** Category name in the app language. */
export function categoryLabel(category: PrayerCategory): string {
  return i18n.t(`prayer.categories.${CATEGORY_KEYS[category]}`);
}

/** "Prayer" / "Testimony" in the app language. */
export function prayerTypeLabel(type: PrayerType): string {
  return i18n.t(`prayer.types.${type}`);
}

/** Name for anonymous authors (the server sends a Portuguese one, which is replaced here). */
export function anonymousName(): string {
  return i18n.t('prayer.anonymousName');
}

/** Name to show for a post or comment author. */
export function authorDisplayName(author: { name: string; isAnonymous: boolean }): string {
  return author.isAnonymous ? anonymousName() : author.name;
}
