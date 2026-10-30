'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { WIDGET_SETTINGS_URL } from '../lib/widgetQuotes';
import type { WidgetTheme } from './QuoteWidget';

const LOOKS = {
  light: { from: '#F6EFED', to: '#EADFDC', title: '#3A0A00', subtitle: '#906F70' },
  dark: { from: '#2B2220', to: '#1C1514', title: '#FFF3F0', subtitle: '#D9B8BA' },
} as const;

/** Shown while the widget is turned off in the app; tapping opens the widget settings. */
export function PausedWidget({ theme }: { theme: WidgetTheme }) {
  const look = LOOKS[theme];

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: WIDGET_SETTINGS_URL }}
      accessibilityLabel="Ativar o widget"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        padding: 12,
        borderRadius: 24,
        backgroundGradient: { from: look.from, to: look.to, orientation: 'TL_BR' },
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexGap: 4,
      }}
    >
      <TextWidget text="Widget pausado" style={{ fontSize: 14, fontWeight: 'bold', color: look.title }} />
      <TextWidget text="Toque para ativar" style={{ fontSize: 12, color: look.subtitle }} />
    </FlexWidget>
  );
}
