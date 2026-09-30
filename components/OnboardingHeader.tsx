import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BrandLogo } from './BrandLogo';
import { colors, fonts, radius } from '../theme/tokens';

interface Props {
  onBack: () => void;
  /** Text on the right side, e.g. "1/2". */
  stepLabel?: string;
}

/** Step header: back | centered logo | step counter. */
export function OnboardingHeader({ onBack, stepLabel }: Props) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        hitSlop={8}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color={colors.onSurface} />
      </Pressable>

      <BrandLogo size={36} />

      <View style={styles.side}>
        {stepLabel ? <Text style={styles.stepLabel}>{stepLabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  side: {
    width: 40,
    alignItems: 'flex-end',
  },
  stepLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
});
