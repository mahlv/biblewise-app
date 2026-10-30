'use no memo';

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetInfo, WidgetRepresentation } from 'react-native-android-widget';
import { readWidgetSettings } from '../lib/widgetSettings';
import { getQuoteForDate, getSlotNumber } from '../lib/widgetQuotes';
import { getWidgetBackground, getWidgetFont } from '../lib/widgetStyle';
import { PausedWidget } from './PausedWidget';
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

/** Builds the light and dark versions of the widget from the saved settings. */
export async function buildQuoteWidget(info: Pick<WidgetInfo, 'width' | 'height'>): Promise<WidgetRepresentation> {
  const settings = await readWidgetSettings();
  if (!settings.enabled) {
    return { light: <PausedWidget theme="light" />, dark: <PausedWidget theme="dark" /> };
  }

  const now = new Date();
  const quote = getQuoteForDate(now, await readOffset(getSlotNumber(now)));
  const size = getWidgetSize(info.width, info.height);
  const background = getWidgetBackground(settings.backgroundId);
  const { family } = getWidgetFont(settings.fontId);

  return {
    light: <QuoteWidget quote={quote} size={size} look={background.light} fontFamily={family} />,
    dark: <QuoteWidget quote={quote} size={size} look={background.dark ?? background.light} fontFamily={family} />,
  };
}
