import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PRAYER_LIMITS } from '../../lib/prayerCategories';
import { colors, fonts, radius, shadow, spacing } from '../../theme/tokens';
import type { IconName } from '../OnboardingOption';

export type DiaryView = 'recordings' | 'wall';

interface Props {
  /** `undefined` while loading. */
  stats: { recordings: number; prayers: number; testimonies: number } | undefined;
  /** The card tied to the active tab is highlighted (cultos on recordings, pedidos on the wall). */
  view: DiaryView;
}

/** Counts are capped by the server; show "200+" when the cap is reached. */
const formatCount = (value: number | undefined): string =>
  value === undefined ? '–' : value >= PRAYER_LIMITS.statsCap ? `${PRAYER_LIMITS.statsCap}+` : String(value);

interface CardProps {
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  label: string;
  count: string;
  highlighted: boolean;
}

function StatCard({ icon, iconColor, iconBackground, label, count, highlighted }: CardProps) {
  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted]} accessibilityLabel={`${count} ${label}`}>
      <View style={[styles.icon, { backgroundColor: iconBackground }]}>
        <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[styles.label, highlighted && styles.labelHighlighted]} numberOfLines={1}>
        {count} {label}
      </Text>
    </View>
  );
}

/** Three rounded cards at the top of "Meu Diário". */
export function DiaryStats({ stats, view }: Props) {
  return (
    <View style={styles.row}>
      <StatCard
        icon="waveform"
        iconColor={colors.secondary}
        iconBackground="#DDE8FF"
        label="Cultos"
        count={formatCount(stats?.recordings)}
        highlighted={view === 'recordings'}
      />
      <StatCard
        icon="heart"
        iconColor={colors.primary}
        iconBackground={colors.selectedIconContainer}
        label="Pedidos"
        count={formatCount(stats?.prayers)}
        highlighted={view === 'wall'}
      />
      <StatCard
        icon="star-four-points"
        iconColor={colors.tertiary}
        iconBackground="#DDF3D6"
        label="Testemunhos"
        count={formatCount(stats?.testimonies)}
        highlighted={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    ...shadow,
  },
  cardHighlighted: { backgroundColor: colors.selectedContainer },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.onSurface },
  labelHighlighted: { color: colors.primary },
});
