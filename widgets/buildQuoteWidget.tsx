'use no memo';

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetInfo, WidgetRepresentation } from 'react-native-android-widget';
import { getQuoteForDate, getSlotNumber } from '../lib/widgetQuotes';
import { QuoteWidget, getWidgetSize } from './QuoteWidget';

export const WIDGET_NAME = 'BiblewiseQuote';

const OFFSET_KEY = '@biblewise/widgetQuoteOffset';

interface StoredOffset {
  slot: number;
  offset: number;
}

/** Manual "next quote" steps; they expire when the 12h slot changes. */
async function readOffset(slot: number): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(OFFSET_KEY);
    const stored = raw ? (JSON.parse(raw) as Partial<StoredOffset>) : null;
    return stored?.slot === slot && Number.isInteger(stored.offset) ? (stored.offset as number) : 0;
  } catch {
    return 0;
  }
}

/** Moves the widget to the next quote until the next scheduled rotation. */
export async function advanceOffset(date = new Date()): Promise<void> {
  const slot = getSlotNumber(date);
  const next = (await readOffset(slot)) + 1;
  await AsyncStorage.setItem(OFFSET_KEY, JSON.stringify({ slot, offset: next } satisfies StoredOffset)).catch(
    () => undefined,
  );
}

/** Builds the light and dark versions of the widget for the current quote. */
export async function buildQuoteWidget(info: Pick<WidgetInfo, 'width' | 'height'>): Promise<WidgetRepresentation> {
  const now = new Date();
  const quote = getQuoteForDate(now, await readOffset(getSlotNumber(now)));
  const size = getWidgetSize(info.width, info.height);

  return {
    light: <QuoteWidget quote={quote} size={size} theme="light" />,
    dark: <QuoteWidget quote={quote} size={size} theme="dark" />,
  };
}
