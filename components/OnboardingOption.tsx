import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, shadow, spacing } from '../theme/tokens';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Smaller text next to the label (e.g. "anos"). */
  suffix?: string;
  /** Leading icon inside a circle. */
  icon?: IconName;
  /** Yellow badge shown while the option is selected (e.g. "Padrão"). */
  badge?: string;
  /** `display`: large EB Garamond label (age range). */
  variant?: 'default' | 'display';
}

/**
 * Single-choice onboarding card.
 *
 * Selected: `primary` border, pink background and filled check. The state is
 * exposed as `radio` to screen readers.
 */
export function OnboardingOption({
  label,
  selected,
  onPress,
  suffix,
  icon,
  badge,
  variant = 'default',
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={suffix ? `${label} ${suffix}` : label}
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.pressed]}
    >
      {icon ? (
        <View style={[styles.icon, selected && styles.iconSelected]}>
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={selected ? colors.primary : colors.onSurfaceVariant}
          />
        </View>
      ) : null}

      <View style={styles.texts}>
        <Text
          numberOfLines={variant === 'display' ? 1 : 2}
          style={[
            variant === 'display' ? styles.labelDisplay : styles.label,
            selected && styles.labelSelected,
          ]}
        >
          {label}
        </Text>
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
        {badge && selected ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadow,
  },
  cardSelected: {
    backgroundColor: colors.selectedContainer,
    borderColor: colors.primary,
    shadowOpacity: 0.16,
  },
  pressed: {
    opacity: 0.9,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSelected: {
    backgroundColor: colors.selectedIconContainer,
  },
  texts: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  label: {
    flexShrink: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
    color: colors.onSurface,
  },
  labelDisplay: {
    fontFamily: fonts.titleMedium,
    fontSize: 26,
    color: colors.onSurface,
    minWidth: 72,
  },
  labelSelected: {
    color: colors.primary,
  },
  suffix: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  badge: {
    backgroundColor: colors.badge,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.onBadge,
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: colors.primary,
  },
});
