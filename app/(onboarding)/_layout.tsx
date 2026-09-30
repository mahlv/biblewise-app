import { Stack } from 'expo-router';
import { colors } from '../../theme/tokens';

/** Entry flow stack: Welcome → Age range → Denomination. */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
