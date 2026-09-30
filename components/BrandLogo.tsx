import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';

interface Props {
  size?: number;
}

/** App logo inside a white circle with a soft shadow (top of the screens). */
export function BrandLogo({ size = 44 }: Props) {
  const frameSize = size + 10;

  return (
    <View
      style={[styles.frame, { width: frameSize, height: frameSize, borderRadius: frameSize / 2 }]}
      accessibilityRole="image"
      accessibilityLabel="Logo do BibleWise"
    >
      <Image
        source={require('../assets/bw-logo.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
