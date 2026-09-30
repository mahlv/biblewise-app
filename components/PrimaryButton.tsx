import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, shadow } from '../theme/tokens';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Shows a spinner and blocks presses (e.g. while waiting for Convex). */
  loading?: boolean;
  /** "→" arrow after the label. Defaults to `true`. */
  showArrow?: boolean;
}

/**
 * Primary pill button ("Continuar →").
 *
 * Solid `primary` instead of the tri-color gradient: the yellow middle stop
 * would leave white text without contrast. The gradient is reserved for the
 * progress bar and decorative highlights.
 */
export function PrimaryButton({ label, onPress, disabled = false, loading = false, showArrow = true }: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <View style={styles.content}>
          <Text style={styles.label}>{label}</Text>
          {showArrow ? <MaterialCommunityIcons name="arrow-right" size={20} color={colors.onPrimary} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
    shadowOpacity: 0.2,
  },
  inactive: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    color: colors.onPrimary,
  },
});
