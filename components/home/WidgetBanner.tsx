import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getLastRotationLabel } from '../../lib/widgetQuotes';
import { colors, fonts, radius, spacing } from '../../theme/tokens';
import { AppPressable } from '../ui/AppPressable';

export type WidgetStatus = 'active' | 'paused' | 'not_added';

const STATUS = {
  active: { labelKey: 'widget.banner.statusActive', color: '#6BC24A' },
  paused: { labelKey: 'widget.banner.statusPaused', color: colors.outline },
  not_added: { labelKey: 'widget.banner.statusNotAdded', color: '#E0A100' },
} as const satisfies Record<WidgetStatus, { labelKey: string; color: string }>;

interface Props {
  status: WidgetStatus;
  onAdjust: () => void;
}

/** Home banner showing the widget's real state; "Adjust" opens the widget settings. */
export function WidgetBanner({ status, onAdjust }: Props) {
  const { t } = useTranslation();
  const { labelKey, color } = STATUS[status];

  return (
    <LinearGradient
      colors={['#FFEAF0', '#F1EFEA', '#E8F3E2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.icon}>
        <MaterialCommunityIcons name="widgets-outline" size={22} color={colors.primary} />
      </View>

      <View style={styles.texts}>
        <View style={styles.badgeRow}>
          <Text style={[styles.badge, { color }]}>{t(labelKey)}</Text>
          <View style={[styles.dot, { backgroundColor: color }]} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {t('widget.banner.title')}
        </Text>
        <Text style={styles.subtitle}>
          {status === 'active'
            ? t('widget.banner.updated', { when: getLastRotationLabel(new Date()) })
            : status === 'paused'
              ? t('widget.banner.pausedHint')
              : t('widget.banner.addHint')}
        </Text>
      </View>

      <AppPressable
        onPress={onAdjust}
        accessibilityRole="button"
        accessibilityLabel={t('widget.banner.adjustLabel')}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.buttonText}>{t('widget.banner.adjust')}</Text>
      </AppPressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.onPrimary,
  },
  texts: { flex: 1, gap: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  title: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onSurface },
  subtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.onSurfaceVariant },
  button: {
    backgroundColor: colors.onPrimary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
  },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.onSurface },
});
