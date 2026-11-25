import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fonts, radius } from '../theme/tokens';
import type { BibleTheme, Verse } from '../types/bible';
import { AppPressable } from './ui/AppPressable';

interface Props {
  verses: Verse[];
  theme: BibleTheme;
  selectedVerse: number | null;
  /** Verses marked with the highlighter. */
  highlightedVerses?: number[];
  /** Right-to-left text (Arabic). */
  rtl?: boolean;
  onToggleVerse: (verse: number) => void;
  onLongPressVerse?: (verse: number) => void;
  /** Reports each verse's y offset (relative to the list) so the screen can scroll to one. */
  onVerseLayout?: (verse: number, y: number) => void;
}

/** Verses with a small superscript number. Tapping toggles selection. */
export function VerseList({ verses, theme, selectedVerse, highlightedVerses = [], rtl = false, onToggleVerse, onLongPressVerse, onVerseLayout }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.list}>
      {verses.map((verse) => {
        const selected = verse.number === selectedVerse;
        const highlighted = highlightedVerses.includes(verse.number);
        return (
          <AppPressable
            key={verse.number}
            onPress={() => onToggleVerse(verse.number)}
            onLongPress={() => onLongPressVerse?.(verse.number)}
            onLayout={(event) => onVerseLayout?.(verse.number, event.nativeEvent.layout.y)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={t('bible.verseLabel', { number: verse.number, text: verse.text })}
            style={[styles.row, highlighted && styles.highlighted, selected && { backgroundColor: theme.verseHighlight, borderLeftColor: theme.accent }]}
          >
            <Text style={[styles.text, { color: theme.text }, rtl && styles.rtl, selected && styles.selectedText]}>
              <Text style={[styles.number, { color: theme.accent }]}>{verse.number}</Text>
              {'  '}
              {verse.text}
            </Text>
          </AppPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4 },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    borderRadius: radius.md,
  },
  text: { fontFamily: fonts.verse, fontSize: 18, lineHeight: 30 },
  rtl: { writingDirection: 'rtl', textAlign: 'right' },
  highlighted: { backgroundColor: 'rgba(247, 240, 82, 0.45)' },
  selectedText: { fontFamily: fonts.titleMedium },
  number: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
});
