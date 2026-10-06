import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTabBar } from '../../components/AppTabBar';
import { MicFab } from '../../components/MicFab';
import { ToastProvider, useToast } from '../../hooks/useToast';
import { colors } from '../../theme/tokens';

/** Approximate tab bar content height, used to float the mic button above it. */
const TAB_BAR_HEIGHT = 58;

function TabsWithFab() {
  const insets = useSafeAreaInsets();
  const toast = useToast();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <AppTabBar {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
      >
        <Tabs.Screen name="home" options={{ title: 'Início' }} />
        <Tabs.Screen name="bible" options={{ title: 'Bíblia' }} />
        <Tabs.Screen name="diary" options={{ title: 'Diário' }} />
      </Tabs>
      <View style={{ position: 'absolute', right: 20, bottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 12 }}>
        <MicFab onPress={() => toast('Comando de voz em breve')} />
      </View>
    </View>
  );
}

/** Main area: shared bottom tab bar (Início / Bíblia / Diário) plus the floating mic button. */
export default function MainLayout() {
  return (
    <ToastProvider>
      <TabsWithFab />
    </ToastProvider>
  );
}
