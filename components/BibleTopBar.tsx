import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme/tokens';

interface Props {
  versionLabel: string;
  bookLabel: string;
  onPressVersion: () => void;
  onPressBook: () => void;
  onPressNotifications: () => void;
  onPressTheme: () => void;
}

function Pill({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.pill, pressed && { opacity: 0.8 }]}
    >
      <Text style={styles.pillText} numberOfLines={1}>
        {label}
      </Text>
      <MaterialCommunityIcons name="chevron-down" size={16} color={colors.onSurfaceVariant} />
    </Pressable>
  );
}

function RoundButton({ icon, onPress, label, badge }: { icon: 'bell-outline' | 'format-size'; onPress: () => void; label: string; badge?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.round, pressed && { opacity: 0.8 }]}
    >
      <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

/** Fixed top bar: version + book selectors on the left, notifications + theme on the right. */
export function BibleTopBar({ versionLabel, bookLabel, onPressVersion, onPressBook, onPressNotifications, onPressTheme }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Pill label={versionLabel} onPress={onPressVersion} accessibilityLabel={`Versão da Bíblia: ${versionLabel}`} />
        <Pill label={bookLabel} onPress={onPressBook} accessibilityLabel={`Livro e capítulo: ${bookLabel}`} />
      </View>
      <View style={styles.right}>
        <RoundButton icon="bell-outline" label="Notificações" onPress={onPressNotifications} badge />
        <RoundButton icon="format-size" label="Temas da Bíblia" onPress={onPressTheme} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  left: { flex: 1, flexDirection: 'row', gap: spacing.sm },
  right: { flexDirection: 'row', gap: spacing.sm },
  pill: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 36,
  },
  pillText: { flexShrink: 1, fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.onSurface },
  round: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
