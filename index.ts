import { Platform } from 'react-native';

// The Android widget runs as a headless JS task, so its handler must be registered at startup.
if (Platform.OS === 'android') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { registerWidgetTaskHandler } = require('react-native-android-widget') as typeof import('react-native-android-widget');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { widgetTaskHandler } = require('./widgets/widgetTaskHandler') as typeof import('./widgets/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('expo-router/entry');
