import type { BibleTheme } from '../types/bible';

export const DEFAULT_THEME_ID = 'alabaster';

/** Reading atmospheres. Palettes are approximated from the reference design. */
export const BIBLE_THEMES: readonly BibleTheme[] = [
  {
    id: 'alabaster',
    name: 'Padrão / Alabastro',
    description: 'Clássico, puro & sereno',
    isPremium: false,
    colors: ['#FFFFFF', '#EEF1FB', '#2B2B2B'],
    background: '#FFF8F6',
    text: '#3A0A00',
    verseHighlight: '#FBE5EC',
    accent: '#B90039',
    cardBackground: '#FFFFFF',
    icon: 'book-open-page-variant-outline',
    iconBackground: '#ECEFF4',
  },
  {
    id: 'celestial-rose',
    name: 'Rosa Celestial',
    description: 'Amor divino & devoção matinal',
    isPremium: true,
    colors: ['#FFE3EC', '#E8265E', '#9B1B5A'],
    background: '#FFEFF4',
    text: '#4A0F26',
    verseHighlight: '#FFD3E0',
    accent: '#E8265E',
    cardBackground: '#FFF9FB',
    icon: 'heart-outline',
    iconBackground: '#FFD9E5',
  },
  {
    id: 'divine-glory',
    name: 'Glória Divina',
    description: 'Ouro nobre & pergaminho sagrado',
    isPremium: true,
    colors: ['#FFF3C4', '#F5B800', '#D97A00'],
    background: '#FBF1D6',
    text: '#3D2B05',
    verseHighlight: '#F6DE9A',
    accent: '#C98500',
    cardBackground: '#FFF9E6',
    icon: 'white-balance-sunny',
    iconBackground: '#FBE79A',
  },
  {
    id: 'slate',
    name: 'Modo Slate',
    description: 'Foco moderno com azul profundo',
    isPremium: true,
    colors: ['#DCE8FF', '#2F6BE0', '#1A3F9E'],
    background: '#E9EEF8',
    text: '#14213D',
    verseHighlight: '#CBDCF8',
    accent: '#2F6BE0',
    cardBackground: '#F6F9FF',
    icon: 'monitor-dashboard',
    iconBackground: '#C9DAF8',
  },
  {
    id: 'cosmic-light',
    name: 'Luz Cósmica',
    description: 'Noite etérea & oração profunda',
    isPremium: true,
    colors: ['#16163A', '#1FD66B', '#E83DBF'],
    background: '#0E0E26',
    text: '#EDEBFF',
    verseHighlight: '#2A2A5C',
    accent: '#1FD66B',
    cardBackground: '#16163A',
    icon: 'star-four-points-outline',
    iconBackground: '#24244F',
  },
  {
    id: 'holy-green',
    name: 'Santuário Verde',
    description: 'Paz, pastos verdes e restauração',
    isPremium: true,
    colors: ['#DDF3D6', '#3E9B4F', '#1E6B34'],
    background: '#EAF6E6',
    text: '#12301B',
    verseHighlight: '#CDEBC4',
    accent: '#2F8A43',
    cardBackground: '#F6FCF3',
    icon: 'leaf',
    iconBackground: '#CDEBC4',
  },
];

export function getTheme(id: string | null | undefined): BibleTheme {
  return BIBLE_THEMES.find((theme) => theme.id === id) ?? BIBLE_THEMES[0]!;
}

/** Premium themes are only applicable in dev builds until billing exists. */
export function isThemeUnlocked(theme: BibleTheme): boolean {
  return !theme.isPremium || __DEV__;
}
