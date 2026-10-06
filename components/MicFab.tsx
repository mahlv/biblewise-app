import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { brandGradient, colors } from '../theme/tokens';

interface Props {
  onPress: () => void;
}

/** Floating microphone button with the brand gradient. */
export function MicFab({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Falar"
      style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
    >
      <LinearGradient
        colors={brandGradient.colors}
        locations={brandGradient.locations}
        start={brandGradient.start}
        end={brandGradient.end}
        style={styles.gradient}
      >
        <MaterialCommunityIcons name="microphone" size={26} color={colors.onPrimary} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  gradient: { flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
