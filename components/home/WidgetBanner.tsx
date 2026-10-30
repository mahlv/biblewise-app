import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getLastRotationLabel } from '../../lib/widgetQuotes';
import { colors, fonts, radius, spacing } from '../../theme/tokens';

export type WidgetStatus = 'active' | 'paused' | 'not_added';

const STATUS: Record<WidgetStatus, { label: string; color: string }> = {
  active: { label: 'WIDGET ATIVO', color: '#6BC24A' },
  paused: { label: 'WIDGET PAUSADO', color: colors.outline },
  not_added: { label: 'ADICIONAR À TELA', color: '#E0A100' },
};

interface Props {
  status: WidgetStatus;
  onAdjust: () => void;
}

/** Home banner showing the widget's real state; "Ajustar" opens the widget settings. */
export function WidgetBanner({ status, onAdjust }: Props) {
  const { label, color } = STATUS[status];

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
          <Text style={[styles.badge, { color }]}>{label}</Text>
          <View style={[styles.dot, { backgroundColor: color }]} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          Versículo na Tela
        </Text>
        <Text style={styles.subtitle}>
          {status === 'active' ? `Atualizado ${getLastRotationLabel(new Date())}` : status === 'paused' ? 'Toque em Ajustar para reativar' : 'Toque em Ajustar para adicionar'}
        </Text>
      </View>

      <Pressable
        onPress={onAdjust}
        accessibilityRole="button"
        accessibilityLabel="Ajustar widget"
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.buttonText}>Ajustar</Text>
      </Pressable>
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
