'use no memo';

import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { loadLanguagePreference } from '../lib/i18n';
import { REFRESH_ACTION } from './QuoteWidget';
import { advanceOffset, buildQuoteWidget } from './buildQuoteWidget';

/**
 * Headless task run by the system when the widget is added, resized, updated
 * (`updatePeriodMillis`) or tapped. Rendering is cheap: it only picks a bundled quote.
 */
export async function widgetTaskHandler({ widgetAction, widgetInfo, clickAction, renderWidget }: WidgetTaskHandlerProps) {
  // This runs without the app UI, so the saved language has to be applied here too.
  await loadLanguagePreference();
  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      renderWidget(await buildQuoteWidget(widgetInfo));
      break;
    case 'WIDGET_CLICK':
      // OPEN_APP / OPEN_URI are handled natively; only the refresh button reaches JS.
      if (clickAction === REFRESH_ACTION) {
        await advanceOffset();
        renderWidget(await buildQuoteWidget(widgetInfo));
      }
      break;
    default:
      break;
  }
}
