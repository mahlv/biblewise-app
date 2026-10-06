import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme/tokens';
import type { BibleTheme } from '../types/bible';

interface Props {
  theme: BibleTheme;
  selected: boolean;
  /** Premium and not applicable yet: shows the lock. */
  locked: boolean;
  onPress: () => void;
}

export function ThemeRow({ theme, selected, locked, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${theme.name}. ${theme.description}. ${theme.isPremium ? 'Premium' : 'Livre'}`}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <View style={[styles.iconBox, { backgroundColor: theme.iconBackground }]}>
        <MaterialCommunityIcons
          name={theme.icon as ComponentProps<typeof MaterialCommunityIcons>['name']}
          size={22}
          color={theme.accent}
        />
      </View>

      <View style={styles.texts}>
        <View style={styles.titleLine}>
          <Text style={styles.name} numberOfLines={1}>
            {theme.name}
          </Text>
          <View style={[styles.badge, theme.isPremium ? styles.badgePremium : styles.badgeFree]}>
            {theme.isPremium ? <MaterialCommunityIcons name="crown" size={10} color={colors.primary} /> : null}
            <Text style={[styles.badgeText, theme.isPremium && { color: colors.primary }]}>{theme.isPremium ? 'Premium' : 'Livre'}</Text>
          </View>
        </View>
        <Text style={styles.description}>{theme.description}</Text>
        <View style={styles.dots}>
          {theme.colors.map((color) => (
            <View key={color} style={[styles.dot, { backgroundColor: color }]} />
          ))}
        </View>
      </View>

      {selected ? (
        <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />
      ) : locked ? (
        <MaterialCommunityIcons name="lock-outline" size={20} color={colors.outline} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
  },
  rowSelected: { borderColor: colors.primary },
  iconBox: { width: 48, height: 56, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 3 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onSurface },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeFree: { backgroundColor: '#FFE3E8' },
  badgePremium: { backgroundColor: '#FFE9E4' },
  badgeText: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.primary },
  description: { fontFamily: fonts.body, fontSize: 11, color: colors.onSurfaceVariant },
  dots: { flexDirection: 'row', gap: 6, marginTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
});
