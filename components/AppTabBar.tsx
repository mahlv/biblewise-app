import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { colors, fonts } from '../theme/tokens';
import type { IconName } from './OnboardingOption';

const TABS: Record<string, { label: string; icon: IconName; activeIcon: IconName }> = {
  home: { label: 'Início', icon: 'home-outline', activeIcon: 'home' },
  bible: { label: 'Bíblia', icon: 'book-open-variant', activeIcon: 'book-open-variant' },
  diary: { label: 'Diário', icon: 'heart-outline', activeIcon: 'heart' },
};

/** Shared bottom navigation (Início / Bíblia / Diário). */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? colors.primary : colors.outline;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.item}
          >
            <MaterialCommunityIcons name={focused ? tab.activeIcon : tab.icon} size={24} color={color} />
            <Text style={[styles.label, { color }, focused && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: 8,
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  labelActive: { fontFamily: fonts.bodyBold },
});
