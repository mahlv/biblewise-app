import { useEffect } from 'react';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EBGaramond_500Medium } from '@expo-google-fonts/eb-garamond/500Medium';
import { EBGaramond_600SemiBold } from '@expo-google-fonts/eb-garamond/600SemiBold';
import { EBGaramond_700Bold } from '@expo-google-fonts/eb-garamond/700Bold';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { OnboardingProvider, useOnboarding } from '../hooks/useOnboarding';
import { colors } from '../theme/tokens';

/**
 * App-wide Convex client.
 *
 * The deployment URL is written by `npx convex dev` into `.env.local` as
 * `EXPO_PUBLIC_CONVEX_URL`. The `EXPO_PUBLIC_` prefix lets Metro inline the
 * variable into the bundle — never put secrets here, the value ships with the
 * installed app.
 *
 * Created at module level (outside any component) so the connection is not
 * recreated on every render or navigation.
 *
 * `unsavedChangesWarning: false` silences a dev warning while local functions
 * have not been pushed to the deployment yet.
 */
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  // Fail early and loudly: without the URL no query works.
  throw new Error(
    'EXPO_PUBLIC_CONVEX_URL is not set. Run `npx convex dev` at the project root to generate .env.local.',
  );
}

const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

// Keep the native splash screen until fonts and onboarding state are ready.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <SafeAreaProvider>
        <OnboardingProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </OnboardingProvider>
      </SafeAreaProvider>
    </ConvexProvider>
  );
}

function RootNavigator() {
  const [fontsLoaded, fontError] = useFonts({
    EBGaramond_500Medium,
    EBGaramond_600SemiBold,
    EBGaramond_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const { status, completed } = useOnboarding();

  // If fonts fail to load, fall back to system fonts instead of hanging.
  const isReady = (fontsLoaded || fontError !== null) && status === 'ready';

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) return null;

  /**
   * Route guard: each group only exists while allowed. When `completed`
   * changes (finishing or redoing onboarding), the router leaves the screen
   * that is no longer allowed and falls back to `index`, which redirects.
   */
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!completed}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={completed}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}
