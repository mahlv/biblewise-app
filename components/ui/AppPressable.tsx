import { forwardRef } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';
import { triggerHaptic, type HapticKind } from '../../lib/haptics';

export interface AppPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  /** Haptic fired on press (after release, so scrolling a list never buzzes). Default `light`. */
  haptic?: HapticKind | 'none';
  /** Haptic fired on long press. Default `medium` when an `onLongPress` exists. */
  hapticOnLongPress?: HapticKind | 'none';
  /** Visual pressed state: dim (default), shrink slightly (cards), or nothing. */
  feedback?: 'opacity' | 'scale' | 'none';
  /** Android ripple (off by default: on rounded views it can show as a square). */
  ripple?: boolean | 'borderless';
}

const PRESSED_OPACITY: ViewStyle = { opacity: 0.85 };
const PRESSED_SCALE: ViewStyle = { transform: [{ scale: 0.97 }] };
const RIPPLE_COLOR = 'rgba(185, 0, 57, 0.14)';

/**
 * Drop-in replacement for `Pressable` that gives every touch the same feedback:
 * a haptic (see `lib/haptics.ts`), a pressed style and an optional Android ripple.
 * Use it instead of `Pressable` everywhere (a lint rule enforces that).
 */
export const AppPressable = forwardRef<View, AppPressableProps>(function AppPressable(
  { onPress, onLongPress, haptic = 'light', hapticOnLongPress = 'medium', feedback = 'opacity', ripple = false, style, disabled, ...rest },
  ref,
) {
  const handlePress = onPress
    ? (event: GestureResponderEvent) => {
        if (haptic !== 'none') triggerHaptic(haptic);
        onPress(event);
      }
    : undefined;

  const handleLongPress = onLongPress
    ? (event: GestureResponderEvent) => {
        if (hapticOnLongPress !== 'none') triggerHaptic(hapticOnLongPress);
        onLongPress(event);
      }
    : undefined;

  return (
    <Pressable
      ref={ref}
      {...rest}
      disabled={disabled}
      onPress={handlePress}
      onLongPress={handleLongPress}
      android_ripple={ripple ? { color: RIPPLE_COLOR, borderless: ripple === 'borderless' } : undefined}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        state.pressed && !disabled && feedback === 'opacity' ? PRESSED_OPACITY : null,
        state.pressed && !disabled && feedback === 'scale' ? PRESSED_SCALE : null,
      ]}
    />
  );
});
