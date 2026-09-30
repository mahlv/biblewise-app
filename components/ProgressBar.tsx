import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { brandGradient, colors, radius } from '../theme/tokens';

/** Duration of the fill animation when `progress` changes. */
const FILL_DURATION_MS = 450;

interface Props {
  /** Progress from 0 to 1. Out-of-range values are clamped. Changes animate. */
  progress: number;
}

/** Thin progress bar filled with the brand tri-color gradient. */
export function ProgressBar({ progress }: Props) {
  const value = Math.min(Math.max(progress, 0), 1);
  // Created once with the initial value (no animation on mount); later changes animate.
  const [animatedValue] = useState(() => new Animated.Value(value));

  useEffect(() => {
    const animation = Animated.timing(animatedValue, {
      toValue: value,
      duration: FILL_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      // `width` is a layout property, which the native driver cannot animate.
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [animatedValue, value]);

  const width = animatedValue.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    >
      <Animated.View style={[styles.fill, { width }]}>
        <LinearGradient
          colors={brandGradient.colors}
          locations={brandGradient.locations}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainer,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
