import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radius } from '../theme/tokens';
import type { BibleTheme, Verse } from '../types/bible';

interface Props {
  verses: Verse[];
  theme: BibleTheme;
  selectedVerse: number | null;
  /** Verses marked with the highlighter. */
  highlightedVerses?: number[];
  onToggleVerse: (verse: number) => void;
  onLongPressVerse?: (verse: number) => void;
  /** Reports each verse's y offset (relative to the list) so the screen can scroll to one. */
  onVerseLayout?: (verse: number, y: number) => void;
}

/** Verses with a small superscript number. Tapping toggles selection. */
export function VerseList({ verses, theme, selectedVerse, highlightedVerses = [], onToggleVerse, onLongPressVerse, onVerseLayout }: Props) {
  return (
    <View style={styles.list}>
      {verses.map((verse) => {
        const selected = verse.number === selectedVerse;
        const highlighted = highlightedVerses.includes(verse.number);
        return (
          <Pressable
            key={verse.number}
            onPress={() => onToggleVerse(verse.number)}
            onLongPress={() => onLongPressVerse?.(verse.number)}
            onLayout={(event) => onVerseLayout?.(verse.number, event.nativeEvent.layout.y)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Versículo ${verse.number}. ${verse.text}`}
            style={[styles.row, highlighted && styles.highlighted, selected && { backgroundColor: theme.verseHighlight, borderLeftColor: theme.accent }]}
          >
            <Text style={[styles.text, { color: theme.text }, selected && styles.selectedText]}>
              <Text style={[styles.number, { color: theme.accent }]}>{verse.number}</Text>
              {'  '}
              {verse.text}
            </Text>
          </Pressable>
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
  highlighted: { backgroundColor: 'rgba(247, 240, 82, 0.45)' },
  selectedText: { fontFamily: fonts.titleMedium },
  number: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
});
