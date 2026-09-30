import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

/**
 * Local onboarding persistence (AsyncStorage).
 *
 * Only two values are stored on the device: the `anonymousId` (device identity)
 * and the completion flag. The choices themselves live in Convex. Every read
 * is failure-tolerant: a missing or corrupted value means "not completed".
 */

const KEYS = {
  anonymousId: '@biblewise/anonymousId',
  onboardingCompleted: '@biblewise/onboardingCompleted',
} as const;

export interface StoredOnboarding {
  anonymousId: string | null;
  onboardingCompleted: boolean;
}

export async function readOnboarding(): Promise<StoredOnboarding> {
  try {
    const pairs = await AsyncStorage.multiGet([KEYS.anonymousId, KEYS.onboardingCompleted]);
    const values = new Map(pairs);
    const anonymousId = values.get(KEYS.anonymousId) ?? null;

    return {
      anonymousId: anonymousId && anonymousId.length > 0 ? anonymousId : null,
      // Only the exact string "true" counts; anything else is "not completed".
      onboardingCompleted: values.get(KEYS.onboardingCompleted) === 'true',
    };
  } catch {
    return { anonymousId: null, onboardingCompleted: false };
  }
}

/** Returns the stored `anonymousId`, or generates and stores a new UUID v4. */
export async function getOrCreateAnonymousId(): Promise<string> {
  const { anonymousId } = await readOnboarding();
  if (anonymousId) return anonymousId;

  const newId = Crypto.randomUUID();
  await AsyncStorage.setItem(KEYS.anonymousId, newId);
  return newId;
}

export async function setOnboardingCompleted(completed: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.onboardingCompleted, completed ? 'true' : 'false');
}
