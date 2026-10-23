import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { IconName } from '../OnboardingOption';
import { colors, fonts, radius, shadow, spacing } from '../../theme/tokens';

interface Props {
  onOpenBible: () => void;
  onOpenRecording: () => void;
  onOpenDiary: () => void;
}

interface ShortcutProps {
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
}

function Shortcut({ icon, iconColor, iconBackground, title, subtitle, badge, onPress }: ShortcutProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.iconCircle, { backgroundColor: iconBackground }]}>
          <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
        </View>
        {badge ? (
          <View style={styles.miniBadge}>
            <Text style={styles.miniBadgeText}>{badge}</Text>
          </View>
        ) : (
          <MaterialCommunityIcons name="arrow-right" size={16} color="#F2A5B8" />
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

/** "Acesso Rápido": 2 cards on the first row, 1 on the second. */
export function QuickAccessGrid({ onOpenBible, onOpenRecording, onOpenDiary }: Props) {
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <Shortcut
          icon="book-open-page-variant-outline"
          iconColor={colors.secondary}
          iconBackground="#DDE8FF"
          title="Bíblia Digital"
          subtitle="Leitura & Busca"
          onPress={onOpenBible}
        />
        <Shortcut
          icon="microphone-outline"
          iconColor={colors.primary}
          iconBackground={colors.selectedIconContainer}
          title="Gravar Culto"
          subtitle="Notas automáticas"
          badge="IA Resumo"
          onPress={onOpenRecording}
        />
      </View>
      <View style={styles.row}>
        <Shortcut
          icon="heart-outline"
          iconColor="#6B3FD1"
          iconBackground="#EADFFF"
          title="Meu Diário"
          subtitle="Orações e fé"
          onPress={onOpenDiary}
        />
        <View style={styles.spacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  spacer: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 2,
    ...shadow,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.sm },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  miniBadge: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: 2,
  },
  miniBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.primary },
  title: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onSurface },
  subtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.onSurfaceVariant },
});
