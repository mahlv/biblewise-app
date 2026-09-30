/**
 * Onboarding options shared by the app and the Convex backend.
 *
 * Plain TypeScript (no React Native) on purpose: `convex/schema.ts` imports the
 * same lists to build its validators, so what the screen offers and what the
 * server accepts can never drift apart.
 */

export const AGE_RANGES = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+'] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

export const DENOMINATIONS = [
  'catholic',
  'evangelical',
  'protestant',
  'pentecostal',
  'non_denominational',
  'orthodox',
  'other',
] as const;
export type Denomination = (typeof DENOMINATIONS)[number];

/** Pre-selected suggestion on step 2 (shows the "Padrão" badge). */
export const DEFAULT_DENOMINATION: Denomination = 'evangelical';

/** User-facing labels (Portuguese). */
export const DENOMINATION_LABELS: Record<Denomination, string> = {
  catholic: 'Católica',
  evangelical: 'Evangélica',
  protestant: 'Protestante',
  pentecostal: 'Pentecostal',
  non_denominational: 'Protestante Não Denominacional',
  orthodox: 'Ortodoxa',
  other: 'Outra / Em busca da fé',
};

export function isAgeRange(value: unknown): value is AgeRange {
  return typeof value === 'string' && (AGE_RANGES as readonly string[]).includes(value);
}

export function isDenomination(value: unknown): value is Denomination {
  return typeof value === 'string' && (DENOMINATIONS as readonly string[]).includes(value);
}
