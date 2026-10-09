import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const BAR_COUNT = 30;
const BAR_WIDTH = 4;
const MAX_HEIGHT = 64;
const MIN_SCALE = 0.08;
/** Gradient stops across the bars: red -> yellow -> blue -> green. */
const STOPS = ['#EF2D56', '#F7F052', '#4C8DFF', '#3DDC84'] as const;

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function colorAt(position: number): string {
  const scaled = position * (STOPS.length - 1);
  const index = Math.min(Math.floor(scaled), STOPS.length - 2);
  const t = scaled - index;
  const from = hexToRgb(STOPS[index]!);
  const to = hexToRgb(STOPS[index + 1]!);
  const channel = (i: 0 | 1 | 2) => Math.round(from[i] + (to[i] - from[i]) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

const BAR_COLORS = Array.from({ length: BAR_COUNT }, (_, index) => colorAt(index / (BAR_COUNT - 1)));

interface Props {
  /** Animate while true; bars settle to a flat line otherwise. */
  active: boolean;
  /** Optional input level from 0 to 1 (from recorder metering). Falls back to a gentle idle motion. */
  level?: number;
}

/** Decorative waveform: bar heights follow the input level with some per-bar variation (no audio analysis). */
export function RecordingWaveform({ active, level }: Props) {
  const [bars] = useState(() => Array.from({ length: BAR_COUNT }, () => new Animated.Value(MIN_SCALE)));

  useEffect(() => {
    const animateTo = (target: (index: number) => number) =>
      Animated.parallel(
        bars.map((bar, index) =>
          Animated.timing(bar, { toValue: target(index), duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ),
      ).start();

    if (!active) {
      animateTo(() => MIN_SCALE);
      return;
    }

    const tick = () => {
      const base = level === undefined ? 0.45 : Math.max(level, 0.12);
      // Bell-shaped envelope so the middle bars are tallest, plus random variation.
      animateTo((index) => {
        const envelope = Math.sin((Math.PI * (index + 1)) / (BAR_COUNT + 1));
        return Math.min(1, Math.max(MIN_SCALE, base * envelope * (0.55 + Math.random() * 0.9)));
      });
    };
    tick();
    const timer = setInterval(tick, 170);
    return () => clearInterval(timer);
  }, [active, level, bars]);

  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[styles.bar, { backgroundColor: BAR_COLORS[index], transform: [{ scaleY: bar }] }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: MAX_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  bar: { width: BAR_WIDTH, height: MAX_HEIGHT, borderRadius: BAR_WIDTH / 2 },
});
