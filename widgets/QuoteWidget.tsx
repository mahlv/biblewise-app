'use no memo';
// The widget tree is built from plain function calls (no hooks); the React Compiler would break that.

import { FlexWidget, SvgWidget, TextWidget, type ColorProp } from 'react-native-android-widget';
import { WIDGET_BIBLE_URL, type WidgetQuote } from '../lib/widgetQuotes';
import type { WidgetLook } from '../lib/widgetStyle';

export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetTheme = 'light' | 'dark';

/** Click action handled by `widgetTaskHandler` to show the next quote. */
export const REFRESH_ACTION = 'REFRESH';

const AUTHOR_FONT = 'PlusJakartaSans_600SemiBold';

// Material "menu_book" and "refresh" glyphs (24x24 viewBox).
const bookIcon = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>`;
const refreshIcon = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`;

/** Picks the layout from the widget's size in dp (2x2 ≈ 110-180, 4x2 ≈ 250x110, 4x4 ≈ 250x250). */
export function getWidgetSize(width: number, height: number): WidgetSize {
  if (width >= 240 && height >= 200) return 'large';
  if (width >= 240) return 'medium';
  return 'small';
}

const QUOTE_FONT_SIZE: Record<WidgetSize, number> = { small: 15, medium: 17, large: 22 };
const QUOTE_MAX_LINES: Record<WidgetSize, number> = { small: 7, medium: 4, large: 9 };

interface ButtonProps {
  svg: string;
  background: ColorProp;
  clickAction: string;
  clickActionData?: Record<string, unknown>;
  label: string;
}

function RoundButton({ svg, background, clickAction, clickActionData, label }: ButtonProps) {
  return (
    <FlexWidget
      clickAction={clickAction}
      clickActionData={clickActionData}
      accessibilityLabel={label}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SvgWidget svg={svg} style={{ width: 20, height: 20 }} />
    </FlexWidget>
  );
}

interface Props {
  quote: WidgetQuote;
  size: WidgetSize;
  look: WidgetLook;
  /** Quote font: family name of a TTF bundled by the config plugin. */
  fontFamily: string;
}

/**
 * Small: quote + author. Medium: adds the Bible button. Large: adds the refresh button.
 * Tapping anywhere else opens the app.
 */
export function QuoteWidget({ quote, size, look, fontFamily }: Props) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        padding: size === 'small' ? 12 : 16,
        borderRadius: 24,
        backgroundGradient: { from: look.from, to: look.to, orientation: 'TL_BR' },
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <TextWidget
        text={`“${quote.text}”`}
        maxLines={QUOTE_MAX_LINES[size]}
        truncate="END"
        style={{
          fontFamily,
          fontSize: QUOTE_FONT_SIZE[size],
          color: look.text,
          // Shrink instead of cutting the text on small launcher grids.
          adjustsFontSizeToFit: size !== 'large',
        }}
      />

      <FlexWidget
        style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <TextWidget
          text={quote.author}
          maxLines={1}
          truncate="END"
          style={{ fontFamily: AUTHOR_FONT, fontSize: size === 'small' ? 11 : 12, color: look.muted }}
        />

        {size === 'small' ? null : (
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
            {size === 'large' ? (
              <RoundButton
                svg={refreshIcon(look.secondaryIcon)}
                background={look.secondaryButton}
                clickAction={REFRESH_ACTION}
                label="Próxima frase"
              />
            ) : null}
            <RoundButton
              svg={bookIcon(look.buttonIcon)}
              background={look.button}
              clickAction="OPEN_URI"
              clickActionData={{ uri: WIDGET_BIBLE_URL }}
              label="Abrir a Bíblia"
            />
          </FlexWidget>
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
