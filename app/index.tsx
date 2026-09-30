import { Redirect } from 'expo-router';
import { useOnboarding } from '../hooks/useOnboarding';

/**
 * Entry route: picks the destination from the flag stored in AsyncStorage.
 * The root layout only renders the navigator after reading the flag, so it is
 * already resolved here.
 */
export default function Index() {
  const { completed } = useOnboarding();
  return <Redirect href={completed ? '/home' : '/welcome'} />;
}
