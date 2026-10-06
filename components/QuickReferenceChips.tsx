import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { QUICK_REFERENCES } from '../constants/quickReferences';
import { colors, fonts, radius, spacing } from '../theme/tokens';

interface Props {
  onSelect: (query: string) => void;
}

/** "RÁPIDO:" horizontally scrollable shortcuts. */
export function QuickReferenceChips({ onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>RÁPIDO:</Text>
      {QUICK_REFERENCES.map((item) => (
        <Pressable
          key={item.label}
          onPress={() => onSelect(item.query)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.chip, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.chipText}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', gap: spacing.sm, paddingRight: spacing.lg },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.8, color: colors.onSurfaceVariant },
  chip: { backgroundColor: colors.surfaceContainer, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.onSurface },
});
