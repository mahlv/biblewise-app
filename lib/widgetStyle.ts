import { fonts } from '../theme/tokens';

/** Customizable look of the home-screen widget. Pure data: shared by the app, Android and iOS sync. */

type Hex = `#${string}`;

/** Every color the widget layouts use (hex only; the native side parses them). */
export interface WidgetLook {
  from: Hex;
  to: Hex;
  text: Hex;
  muted: Hex;
  /** Filled round button (Bible) and its icon. */
  button: Hex;
  buttonIcon: Hex;
  /** Secondary round button (refresh) and its icon. */
  secondaryButton: Hex;
  secondaryIcon: Hex;
}

export interface WidgetBackground {
  id: string;
  label: string;
  light: WidgetLook;
  /** Only `auto` follows the system theme; presets look the same in both. */
  dark?: WidgetLook;
}

const preset = (id: string, label: string, from: Hex, to: Hex, text: Hex, muted: Hex): WidgetBackground => {
  const darkText = text !== '#FFFFFF';
  return {
    id,
    label,
    light: {
      from,
      to,
      text,
      muted,
      button: darkText ? text : '#FFFFFF',
      buttonIcon: darkText ? '#FFFFFF' : from,
      secondaryButton: '#FFFFFF',
      secondaryIcon: darkText ? text : from,
    },
  };
};

/** `auto` = the app's soft pink look, switching to a dark brown one with the system theme. */
const AUTO: WidgetBackground = {
  id: 'auto',
  label: 'Automático',
  light: {
    from: '#FFF3F0',
    to: '#FFDDE3',
    text: '#3A0A00',
    muted: '#906F70',
    button: '#B90039',
    buttonIcon: '#FFFFFF',
    secondaryButton: '#FFFFFF',
    secondaryIcon: '#B90039',
  },
  dark: {
    from: '#3A1A14',
    to: '#1F0F0C',
    text: '#FFF3F0',
    muted: '#D9B8BA',
    button: '#EF2D56',
    buttonIcon: '#FFFFFF',
    secondaryButton: '#4A2A24',
    secondaryIcon: '#FFD9DF',
  },
};

export const WIDGET_BACKGROUNDS: readonly WidgetBackground[] = [
  AUTO,
  preset('night', 'Noite', '#101A2E', '#2A1530', '#FFFFFF', '#C7C9D1'),
  preset('dawn', 'Amanhecer', '#E8576F', '#6B3FA0', '#FFFFFF', '#F5E1EC'),
  preset('forest', 'Floresta', '#0F2E22', '#3C7A4F', '#FFFFFF', '#CFE3D6'),
  preset('royal', 'Real', '#0B2A6F', '#4C8DFF', '#FFFFFF', '#D6E4FF'),
  preset('parchment', 'Pergaminho', '#FBF1D9', '#E8C98B', '#3D2B05', '#7A6A45'),
  preset('rose', 'Rosa', '#FFE3EC', '#F7A6BD', '#4A0F26', '#7D4A5C'),
];

export interface WidgetFont {
  id: string;
  label: string;
  /** App font family; also the TTF file name bundled for the Android widget. */
  family: string;
  /** iOS widgets cannot use the app fonts, so they map to the closest system style. */
  iosDesign: 'serif' | 'default';
  iosWeight: 'regular' | 'medium' | 'semibold' | 'bold';
  iosItalic: boolean;
}

export const WIDGET_FONTS: readonly WidgetFont[] = [
  { id: 'classic', label: 'Clássica', family: fonts.titleMedium, iosDesign: 'serif', iosWeight: 'medium', iosItalic: false },
  { id: 'italic', label: 'Itálica', family: fonts.verseItalic, iosDesign: 'serif', iosWeight: 'regular', iosItalic: true },
  { id: 'bold', label: 'Destaque', family: fonts.titleBold, iosDesign: 'serif', iosWeight: 'bold', iosItalic: false },
  { id: 'modern', label: 'Moderna', family: fonts.bodySemiBold, iosDesign: 'default', iosWeight: 'semibold', iosItalic: false },
];

export const getWidgetBackground = (id: string): WidgetBackground =>
  WIDGET_BACKGROUNDS.find((item) => item.id === id) ?? WIDGET_BACKGROUNDS[0]!;
export const getWidgetFont = (id: string): WidgetFont => WIDGET_FONTS.find((item) => item.id === id) ?? WIDGET_FONTS[1]!;
