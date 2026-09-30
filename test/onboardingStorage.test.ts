import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrCreateAnonymousId, readOnboarding, setOnboardingCompleted } from '../lib/onboardingStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-crypto', () => ({
  randomUUID: () => '3b241101-e2bb-4255-8caf-4136c566a962',
}));

describe('onboardingStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('treats an empty storage as not completed', async () => {
    expect(await readOnboarding()).toEqual({ anonymousId: null, onboardingCompleted: false });
  });

  it('treats a corrupted flag as not completed', async () => {
    await AsyncStorage.setItem('@biblewise/onboardingCompleted', '{garbage');
    expect((await readOnboarding()).onboardingCompleted).toBe(false);
  });

  it('generates the anonymousId once and reuses it', async () => {
    const first = await getOrCreateAnonymousId();
    const second = await getOrCreateAnonymousId();
    expect(first).toBe('3b241101-e2bb-4255-8caf-4136c566a962');
    expect(second).toBe(first);
  });

  it('persists and clears the completion flag', async () => {
    await setOnboardingCompleted(true);
    expect((await readOnboarding()).onboardingCompleted).toBe(true);
    await setOnboardingCompleted(false);
    expect((await readOnboarding()).onboardingCompleted).toBe(false);
  });
});
