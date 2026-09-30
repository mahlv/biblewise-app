import { Stack } from 'expo-router';
import { colors } from '../../theme/tokens';

/**
 * Main app area. For now only the (temporary) Home exists; once there are more
 * sections (Today, Bible, Stories, Profile) this layout becomes `Tabs`.
 */
export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
  );
}
