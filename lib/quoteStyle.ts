import { fonts } from '../theme/tokens';

/** Customizable look of the shareable quote art. Pure data, no React Native imports besides tokens. */

export interface QuoteBackground {
  id: string;
  label: string;
  /** Three gradient stops, top-left to bottom-right. */
  colors: [string, string, string];
  text: string;
  muted: string;
  chip: string;
}

export const QUOTE_BACKGROUNDS: readonly QuoteBackground[] = [
  { id: 'night', label: 'Noite', colors: ['#101A2E', '#1B1B3A', '#2A1530'], text: '#FFFFFF', muted: 'rgba(255,255,255,0.72)', chip: 'rgba(255,255,255,0.14)' },
  { id: 'dawn', label: 'Amanhecer', colors: ['#F8A978', '#E8576F', '#6B3FA0'], text: '#FFFFFF', muted: 'rgba(255,255,255,0.85)', chip: 'rgba(255,255,255,0.2)' },
  { id: 'forest', label: 'Floresta', colors: ['#0F2E22', '#1F5A3E', '#3C7A4F'], text: '#FFFFFF', muted: 'rgba(255,255,255,0.75)', chip: 'rgba(255,255,255,0.16)' },
  { id: 'royal', label: 'Real', colors: ['#0B2A6F', '#0051D4', '#4C8DFF'], text: '#FFFFFF', muted: 'rgba(255,255,255,0.8)', chip: 'rgba(255,255,255,0.18)' },
  { id: 'parchment', label: 'Pergaminho', colors: ['#FBF1D9', '#F2DFB4', '#E8C98B'], text: '#3D2B05', muted: 'rgba(61,43,5,0.7)', chip: 'rgba(61,43,5,0.1)' },
  { id: 'rose', label: 'Rosa', colors: ['#FFE3EC', '#F7A6BD', '#E8265E'], text: '#4A0F26', muted: 'rgba(74,15,38,0.72)', chip: 'rgba(74,15,38,0.1)' },
];

export interface QuoteFont {
  id: string;
  label: string;
  family: string;
}

export const QUOTE_FONTS: readonly QuoteFont[] = [
  { id: 'classic', label: 'Clássica', family: fonts.titleMedium },
  { id: 'italic', label: 'Itálica', family: fonts.verseItalic },
  { id: 'bold', label: 'Destaque', family: fonts.titleBold },
  { id: 'modern', label: 'Moderna', family: fonts.bodySemiBold },
];

export const QUOTE_SIZES = [
  { id: 'small', label: 'P', scale: 0.85 },
  { id: 'medium', label: 'M', scale: 1 },
  { id: 'large', label: 'G', scale: 1.15 },
] as const;

export const QUOTE_FORMATS = [
  { id: 'card', label: 'Cartão', aspectRatio: 4 / 5 },
  { id: 'story', label: 'Story', aspectRatio: 9 / 16 },
] as const;

export interface QuoteStyle {
  backgroundId: string;
  fontId: string;
  sizeId: (typeof QUOTE_SIZES)[number]['id'];
  formatId: (typeof QUOTE_FORMATS)[number]['id'];
}

export const DEFAULT_QUOTE_STYLE: QuoteStyle = { backgroundId: 'night', fontId: 'classic', sizeId: 'medium', formatId: 'card' };

export const getBackground = (id: string): QuoteBackground => QUOTE_BACKGROUNDS.find((item) => item.id === id) ?? QUOTE_BACKGROUNDS[0]!;
export const getFont = (id: string): QuoteFont => QUOTE_FONTS.find((item) => item.id === id) ?? QUOTE_FONTS[0]!;
export const getSize = (id: string) => QUOTE_SIZES.find((item) => item.id === id) ?? QUOTE_SIZES[1];
export const getFormat = (id: string) => QUOTE_FORMATS.find((item) => item.id === id) ?? QUOTE_FORMATS[0];

/** Validates a stored value; any unknown id falls back to the default for that field. */
export function sanitizeQuoteStyle(value: unknown): QuoteStyle {
  const raw = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const pick = <T extends { id: string }>(list: readonly T[], id: unknown, fallback: string) =>
    list.some((item) => item.id === id) ? (id as string) : fallback;
  return {
    backgroundId: pick(QUOTE_BACKGROUNDS, raw.backgroundId, DEFAULT_QUOTE_STYLE.backgroundId),
    fontId: pick(QUOTE_FONTS, raw.fontId, DEFAULT_QUOTE_STYLE.fontId),
    sizeId: pick(QUOTE_SIZES, raw.sizeId, DEFAULT_QUOTE_STYLE.sizeId) as QuoteStyle['sizeId'],
    formatId: pick(QUOTE_FORMATS, raw.formatId, DEFAULT_QUOTE_STYLE.formatId) as QuoteStyle['formatId'],
  };
}

/** Base font size (at a 350 px wide card) that shrinks for long quotes so the text always fits. */
export function quoteBaseFontSize(length: number): number {
  if (length <= 80) return 26;
  if (length <= 140) return 23;
  if (length <= 220) return 20;
  if (length <= 320) return 17;
  return 15;
}

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

/** "20 OUT 2024" */
export function formatQuoteDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Wraps the text in typographic quotes once, ignoring quotes the model may already have added. */
export function withQuoteMarks(text: string): string {
  return `“${text.trim().replace(/^["“”']+|["“”']+$/g, '')}”`;
}
