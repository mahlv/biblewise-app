import { ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { QUICK_REFERENCES } from '../constants/quickReferences';
import { getBook } from '../lib/bibleLoader';
import type { ReadingPosition } from '../types/bible';
import { colors, fonts, radius, spacing } from '../theme/tokens';
import { AppPressable } from './ui/AppPressable';

interface Props {
  /** Version whose book names label the chips; chips for books it lacks are hidden. */
  versionCode: string;
  onSelect: (position: ReadingPosition, verse?: number) => void;
}

/** "QUICK:" horizontally scrollable shortcuts. */
export function QuickReferenceChips({ versionCode, onSelect }: Props) {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>{t('bible.quick.label')}</Text>
      {QUICK_REFERENCES.map((item) => {
        const book = getBook(versionCode, item.bookId);
        if (!book || item.chapter > book.chapters.length) return null;
        const label = `${book.name} ${item.chapter}${item.verse ? `:${item.verse}` : ''}`;
        return (
          <AppPressable haptic="selection"
            key={label}
            onPress={() => onSelect({ bookId: item.bookId, chapter: item.chapter }, item.verse)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.chip, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.chipText}>{label}</Text>
          </AppPressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', gap: spacing.sm, paddingRight: spacing.lg },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.8, color: colors.onSurfaceVariant },
  chip: { backgroundColor: colors.surfaceContainer, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.onSurface },
});
