import quotesData from '../assets/widget/quotes.json';

export type WidgetQuoteType = 'bible' | 'philosopher';

export interface WidgetQuote {
  id: string;
  text: string;
  author: string;
  type: WidgetQuoteType;
}

export const WIDGET_QUOTES: readonly WidgetQuote[] = quotesData as WidgetQuote[];

/** Deep link opened by the widget's Bible button. Resolves to the Bible tab. */
export const WIDGET_BIBLE_URL = 'biblewise://bible';
/** Deep link opened by the paused widget (lets the user turn it back on). */
export const WIDGET_SETTINGS_URL = 'biblewise://widget/settings';

const HOUR_MS = 60 * 60 * 1000;
/** Quotes rotate twice a day, at 06:00 and 18:00 local time. */
const SLOT_MS = 12 * HOUR_MS;
const FIRST_SLOT_HOUR = 6;

/**
 * Number of the 12h slot that `date` falls in (slots start at 06:00 and 18:00 local time).
 * The Swift widget uses the same formula so both platforms show the same quote.
 */
export function getSlotNumber(date: Date): number {
  const localMs = date.getTime() - date.getTimezoneOffset() * 60 * 1000;
  return Math.floor((localMs - FIRST_SLOT_HOUR * HOUR_MS) / SLOT_MS);
}

/** When the current quote started showing, e.g. "hoje às 06:00" (rotations happen at 06:00 and 18:00). */
export function getLastRotationLabel(date: Date): string {
  const hour = date.getHours();
  if (hour >= 18) return 'hoje às 18:00';
  if (hour >= FIRST_SLOT_HOUR) return 'hoje às 06:00';
  return 'ontem às 18:00';
}

/** The quote for the slot of `date`; `offset` moves forward manually (the Refresh button). */
export function getQuoteForDate(date: Date, offset = 0, quotes: readonly WidgetQuote[] = WIDGET_QUOTES): WidgetQuote {
  const total = quotes.length;
  const index = (((getSlotNumber(date) + offset) % total) + total) % total;
  return quotes[index] as WidgetQuote;
}
