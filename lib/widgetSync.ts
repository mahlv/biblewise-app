import { Platform } from 'react-native';
import { WIDGET_QUOTES } from './widgetQuotes';

/** Must match `ios.entitlements` in app.json and `targets/widget/expo-target.config.js`. */
export const WIDGET_APP_GROUP = 'group.com.mahlv.biblewise';
/** Key the Swift widget reads from the App Group's UserDefaults. */
export const WIDGET_QUOTES_KEY = 'widgetQuotes';

/**
 * Pushes the latest widget data to the native side and asks it to redraw.
 * Call once per app launch. Native modules are loaded lazily, so a build that
 * predates the widget setup just skips the sync instead of crashing.
 *
 * - iOS: copies the quotes to the App Group (the widget cannot read the JS bundle).
 * - Android: the widget renders from the bundled JSON itself; this only forces a redraw.
 */
export async function syncWidget(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ExtensionStorage } = require('@bacons/apple-targets') as typeof import('@bacons/apple-targets');
      new ExtensionStorage(WIDGET_APP_GROUP).set(
        WIDGET_QUOTES_KEY,
        WIDGET_QUOTES.map(({ id, text, author, type }) => ({ id, text, author, type })),
      );
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
