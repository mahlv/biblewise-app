import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme/tokens';
import { AppPressable } from './ui/AppPressable';

interface Props {
  /** Label for the previous button; `null` hides it (start of the Bible). */
  previousLabel: string | null;
  /** Label for the next button; `null` hides it (end of the Bible). */
  nextLabel: string | null;
  onPrevious: () => void;
  onNext: () => void;
  accent: string;
}

export function ChapterNavigation({ previousLabel, nextLabel, onPrevious, onNext, accent }: Props) {
  return (
    <View style={styles.row}>
      {previousLabel ? (
        <AppPressable onPress={onPrevious} accessibilityRole="button" accessibilityLabel={previousLabel} style={styles.button}>
          <MaterialCommunityIcons name="chevron-left" size={18} color={colors.outline} />
          <Text style={[styles.label, { color: colors.outline }]}>{previousLabel}</Text>
        </AppPressable>
      ) : (
        <View />
      )}
      {nextLabel ? (
        <AppPressable onPress={onNext} accessibilityRole="button" accessibilityLabel={nextLabel} style={styles.button}>
          <Text style={[styles.label, { color: accent }]}>{nextLabel}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={accent} />
        </AppPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
});
