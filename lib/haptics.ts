import { requireOptionalNativeModule } from 'expo';

/**
 * Haptic feedback with a small semantic vocabulary, so screens say *what happened* and this
 * module decides how it feels:
 *  - `light`: an ordinary tap
 *  - `selection`: choosing something (chips, tabs, toggles, likes)
 *  - `medium`: a bigger action (start/stop recording, long press)
 *  - `success` / `warning` / `error`: outcome of an action, or opening a destructive one
 *
 * `expo-haptics` is a native module: it is loaded lazily and only when the build contains it,
 * so a build made before it was added keeps working (haptics are just a no-op there).
 */
export type HapticKind = 'light' | 'medium' | 'selection' | 'success' | 'warning' | 'error';

const STORAGE_KEY = '@biblewise/hapticsEnabled';
/** Two haptics closer than this are collapsed into one (double handlers, quick re-taps). */
const THROTTLE_MS = 40;

type HapticsModule = typeof import('expo-haptics');

/** Loaded on demand: importing AsyncStorage at the top would make every screen that renders a button need its native module. */
function storage(): typeof import('@react-native-async-storage/async-storage').default {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@react-native-async-storage/async-storage') as typeof import('@react-native-async-storage/async-storage')).default;
}

let enabled = true;
let lastFiredAt = 0;
let nativeModule: HapticsModule | null | undefined;

function getModule(): HapticsModule | null {
  if (nativeModule !== undefined) return nativeModule;
  nativeModule = null;
  try {
    if (requireOptionalNativeModule('ExpoHaptics')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      nativeModule = require('expo-haptics') as HapticsModule;
    }
  } catch {
    nativeModule = null;
  }
  return nativeModule;
}

/** Fires the haptic for `kind` (fire-and-forget; never throws). */
export function triggerHaptic(kind: HapticKind, now: number = Date.now()): void {
  if (!enabled || now - lastFiredAt < THROTTLE_MS) return;
  const module = getModule();
  if (!module) return;
  lastFiredAt = now;

  try {
    let pending: Promise<void>;
    switch (kind) {
      case 'light':
        pending = module.impactAsync(module.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        pending = module.impactAsync(module.ImpactFeedbackStyle.Medium);
        break;
      case 'selection':
        pending = module.selectionAsync();
        break;
      case 'success':
        pending = module.notificationAsync(module.NotificationFeedbackType.Success);
        break;
      case 'warning':
        pending = module.notificationAsync(module.NotificationFeedbackType.Warning);
        break;
      case 'error':
        pending = module.notificationAsync(module.NotificationFeedbackType.Error);
        break;
    }
    pending.catch(() => undefined);
  } catch {
    // Haptics are a nicety: never let them break an interaction.
  }
}

/** Shorthand for call sites that are not buttons: `haptics.success()` after publishing, etc. */
export const haptics = {
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  selection: () => triggerHaptic('selection'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
};

export function isHapticsEnabled(): boolean {
  return enabled;
}

/** Turns haptics on/off for the whole app and remembers the choice. */
export async function setHapticsEnabled(value: boolean): Promise<void> {
  enabled = value;
  try {
    await storage().setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Not being able to remember the choice must not break the switch.
  }
}

/** Reads the saved choice (call once at app start); default is on. */
export async function loadHapticsPreference(): Promise<boolean> {
  try {
    enabled = (await storage().getItem(STORAGE_KEY)) !== '0';
  } catch {
    enabled = true;
  }
  return enabled;
}
