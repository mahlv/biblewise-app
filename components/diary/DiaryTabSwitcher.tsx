import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../../theme/tokens';
import type { IconName } from '../OnboardingOption';
import type { DiaryView } from './DiaryStats';

interface Props {
  view: DiaryView;
  onChange: (view: DiaryView) => void;
}

const TABS: { id: DiaryView; label: string; icon: IconName }[] = [
  { id: 'recordings', label: 'Minhas Gravações', icon: 'microphone-outline' },
  { id: 'wall', label: 'Mural de Oração Testemunho', icon: 'heart-outline' },
];

/** Pill switcher between "Minhas Gravações" and "Mural de Oração Testemunho". */
export function DiaryTabSwitcher({ view, onChange }: Props) {
  return (
    <View style={styles.pill} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const active = tab.id === view;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.tab, active && styles.tabActive]}
          >
            <MaterialCommunityIcons name={tab.icon} size={18} color={active ? colors.onPrimary : colors.outline} />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={2}>
              {tab.label}
            </Text>
          </Pressable>
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
