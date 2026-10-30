import { Platform } from 'react-native';
import { readWidgetSettings, type WidgetSettings } from './widgetSettings';
import { WIDGET_QUOTES } from './widgetQuotes';
import { getWidgetBackground, getWidgetFont } from './widgetStyle';

/** Must match `ios.entitlements` in app.json and `targets/widget/expo-target.config.js`. */
export const WIDGET_APP_GROUP = 'group.com.mahlv.biblewise';
/** Key the Swift widget reads from the App Group's UserDefaults. */
export const WIDGET_QUOTES_KEY = 'widgetQuotes';
/** Key of the resolved look/enabled state the Swift widget reads. */
export const WIDGET_SETTINGS_KEY = 'widgetSettings';

/**
 * Settings flattened for Swift (which cannot share the TS style tables).
 * `auto` sends no colors: the widget then uses its own light/dark asset colors.
 */
function toNativeSettings(settings: WidgetSettings): Record<string, string | number> {
  const font = getWidgetFont(settings.fontId);
  const base = {
    enabled: settings.enabled ? 1 : 0,
    fontDesign: font.iosDesign,
    fontWeight: font.iosWeight,
    fontItalic: font.iosItalic ? 1 : 0,
  };
  if (settings.backgroundId === 'auto') return base;

  const { light } = getWidgetBackground(settings.backgroundId);
  return {
    ...base,
    from: light.from,
    to: light.to,
    text: light.text,
    muted: light.muted,
    button: light.button,
    buttonIcon: light.buttonIcon,
    secondaryButton: light.secondaryButton,
    secondaryIcon: light.secondaryIcon,
  };
}

/**
 * Pushes the latest widget data to the native side and asks it to redraw.
 * Call once per app launch and after every settings change. Native modules are
 * loaded lazily, so a build that predates the widget setup just skips the sync
 * instead of crashing.
 *
 * - iOS: copies quotes and settings to the App Group (the widget cannot read the JS bundle).
 * - Android: the widget renders from the bundled JSON and AsyncStorage itself; this only forces a redraw.
 */
export async function syncWidget(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ExtensionStorage } = require('@bacons/apple-targets') as typeof import('@bacons/apple-targets');
      const storage = new ExtensionStorage(WIDGET_APP_GROUP);
      storage.set(
        WIDGET_QUOTES_KEY,
        WIDGET_QUOTES.map(({ id, text, author, type }) => ({ id, text, author, type })),
      );
      storage.set(WIDGET_SETTINGS_KEY, toNativeSettings(await readWidgetSettings()));
      ExtensionStorage.reloadWidget();
    } else if (Platform.OS === 'android') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import('react-native-android-widget');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { WIDGET_NAME, buildQuoteWidget } = require('../widgets/buildQuoteWidget') as typeof import('../widgets/buildQuoteWidget');
      await requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: buildQuoteWidget });
    }
  } catch (error) {
    if (__DEV__) console.warn('Widget sync skipped', error);
  }
}

/**
 * Whether the user has placed the widget on the home screen.
 * Only Android can tell; iOS (or a build without the native module) returns `null`.
 */
export async function isWidgetPlaced(): Promise<boolean | null> {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getWidgetInfo } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { WIDGET_NAME } = require('../widgets/buildQuoteWidget') as typeof import('../widgets/buildQuoteWidget');
    return (await getWidgetInfo(WIDGET_NAME)).length > 0;
  } catch {
    return null;
  }
}

/** Opens the launcher's "add widget" prompt (Android). Resolves `false` when unsupported. */
export async function requestPinWidgetPrompt(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requestPinWidget } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { WIDGET_NAME } = require('../widgets/buildQuoteWidget') as typeof import('../widgets/buildQuoteWidget');
    return await requestPinWidget({ widgetName: WIDGET_NAME });
  } catch {
    return false;
  }
}
