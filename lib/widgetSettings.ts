import AsyncStorage from '@react-native-async-storage/async-storage';
import { WIDGET_BACKGROUNDS, WIDGET_FONTS } from './widgetStyle';

/**
 * User choices for the home-screen widget. Stored in AsyncStorage, which the
 * Android widget's headless task can read too.
 * `enabled: false` pauses the widget (the OS offers no way to remove it from the app).
 */
export interface WidgetSettings {
  enabled: boolean;
  backgroundId: string;
  fontId: string;
}

/** Matches the look the widget had before it became customizable. */
export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = { enabled: true, backgroundId: 'auto', fontId: 'italic' };

const KEY = '@biblewise/widgetSettings';

/** Validates a stored value; any unknown field falls back to its default. */
export function sanitizeWidgetSettings(value: unknown): WidgetSettings {
  const raw = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const pick = (list: readonly { id: string }[], id: unknown, fallback: string) =>
    list.some((item) => item.id === id) ? (id as string) : fallback;
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_WIDGET_SETTINGS.enabled,
    backgroundId: pick(WIDGET_BACKGROUNDS, raw.backgroundId, DEFAULT_WIDGET_SETTINGS.backgroundId),
    fontId: pick(WIDGET_FONTS, raw.fontId, DEFAULT_WIDGET_SETTINGS.fontId),
  };
}

export async function readWidgetSettings(): Promise<WidgetSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? sanitizeWidgetSettings(JSON.parse(raw)) : DEFAULT_WIDGET_SETTINGS;
  } catch {
    return DEFAULT_WIDGET_SETTINGS;
  }
}

/** Best effort: a failed write must not block the screen. */
export async function saveWidgetSettings(settings: WidgetSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings)).catch(() => undefined);
}
