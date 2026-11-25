import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius, spacing } from '../../theme/tokens';
import type { IconName } from '../OnboardingOption';
import type { DiaryView } from './DiaryStats';
import { AppPressable } from '../ui/AppPressable';

interface Props {
  view: DiaryView;
  onChange: (view: DiaryView) => void;
}

const TABS: { id: DiaryView; labelKey: 'diary.tabs.recordings' | 'diary.tabs.wall'; icon: IconName }[] = [
  { id: 'recordings', labelKey: 'diary.tabs.recordings', icon: 'microphone-outline' },
  { id: 'wall', labelKey: 'diary.tabs.wall', icon: 'heart-outline' },
];

/** Pill switcher between "My Recordings" and the prayer & testimony wall. */
export function DiaryTabSwitcher({ view, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.pill} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const active = tab.id === view;
        return (
          <AppPressable haptic="selection"
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.tab, active && styles.tabActive]}
          >
            <MaterialCommunityIcons name={tab.icon} size={18} color={active ? colors.onPrimary : colors.outline} />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={2}>
              {t(tab.labelKey)}
            </Text>
          </AppPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', gap: spacing.xs, backgroundColor: colors.surfaceContainer, borderRadius: radius.pill, padding: 4 },
  tab: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  tabActive: { backgroundColor: colors.primary },
  label: { flexShrink: 1, textAlign: 'center', fontFamily: fonts.bodySemiBold, fontSize: 13, lineHeight: 17, color: colors.outline },
  labelActive: { color: colors.onPrimary },
});
