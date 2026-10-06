/**
 * Design system tokens, extracted from the reference screens.
 *
 * Plain TypeScript object (no theming library): changing the visual identity
 * means editing this file. Color keys follow the design's Material 3 naming
 * (`on-surface`, `outline`...), in camelCase.
 */
export const colors = {
  primary: '#B90039',
  secondary: '#0051D4',
  tertiary: '#376725',
  background: '#FFF8F6',
  surfaceContainerLowest: '#FFFFFF',
  /** Soft pink fills (progress track, empty radio, icon circles). */
  surfaceContainer: '#FFE9E4',
  /** Hairline borders on white cards. */
  outlineVariant: '#F3E1DD',
  onSurface: '#3A0A00',
  onSurfaceVariant: '#5C3F41',
  outline: '#906F70',
  onPrimary: '#FFFFFF',
  /** Selected card background. */
  selectedContainer: '#FFEEF0',
  /** Selected icon circle background. */
  selectedIconContainer: '#FFD9DF',
  /** Yellow "Padrão" badge. */
  badge: '#F7F052',
  onBadge: '#3A0A00',
} as const;

/** Brand tri-color gradient (135°): pink → yellow → blue. */
export const brandGradient = {
  colors: ['#EF2D56', '#F7F052', '#0051D4'] as const,
  locations: [0, 0.5, 1] as const,
  /** 135° in `expo-linear-gradient` coordinates (top-left → bottom-right). */
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;

/**
 * Font family names loaded in `app/_layout.tsx`.
 * Each weight is its own family in React Native (do not combine with `fontWeight`).
 */
export const fonts = {
  verse: 'EBGaramond_400Regular',
  verseItalic: 'EBGaramond_400Regular_Italic',
  titleMedium: 'EBGaramond_500Medium',
  titleSemiBold: 'EBGaramond_600SemiBold',
  titleBold: 'EBGaramond_700Bold',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemiBold: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Soft shadow used by cards and the primary button. */
export const shadow = {
  shadowColor: '#B90039',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
