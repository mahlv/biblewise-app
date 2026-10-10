import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_QUOTE_STYLE, sanitizeQuoteStyle, type QuoteStyle } from './quoteStyle';

const KEY = '@biblewise/quoteStyle';

export async function readQuoteStyle(): Promise<QuoteStyle> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? sanitizeQuoteStyle(JSON.parse(raw)) : DEFAULT_QUOTE_STYLE;
  } catch {
    return DEFAULT_QUOTE_STYLE;
  }
}

/** Best effort: a failed write must not block sharing. */
export async function saveQuoteStyle(style: QuoteStyle): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(style)).catch(() => undefined);
}
