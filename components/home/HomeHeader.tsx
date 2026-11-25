import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { brandGradient, colors, fonts, spacing } from '../../theme/tokens';
import { AppPressable } from '../ui/AppPressable';

interface Props {
  /** User name from Convex; the greeting drops it when missing. */
  name: string | null;
  /** Profile picture URL; initials are shown when missing. */
  imageUrl?: string | null;
  /** Unread notifications; the bell shows a badge when above zero. */
  unreadCount: number;
  onPressBell: () => void;
  onPressAvatar: () => void;
  onLongPressAvatar?: () => void;
}

/** "DOMINGO, 20 DE OUTUBRO" for the current device date. */
function formatToday(date: Date): string {
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

/** Date, greeting, notification bell and avatar. */
export function HomeHeader({ name, imageUrl, unreadCount, onPressBell, onPressAvatar, onLongPressAvatar }: Props) {
  const firstName = name?.trim().split(/\s+/)[0];
  const initials = name?.trim() ? initialsOf(name) : '';

  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text style={styles.date}>{formatToday(new Date())}</Text>
        <Text style={styles.greeting} numberOfLines={1}>
          {firstName ? `Bom dia, ${firstName}` : 'Bom dia'}
        </Text>
      </View>

      <AppPressable onPress={onPressBell} accessibilityRole="button" accessibilityLabel="Notificações" style={styles.bell}>
        <MaterialCommunityIcons name="bell-outline" size={22} color={colors.onSurface} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        ) : null}
      </AppPressable>

      <AppPressable
        onPress={onPressAvatar}
        onLongPress={onLongPressAvatar}
        accessibilityRole="button"
        accessibilityLabel="Perfil"
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.avatar} />
        ) : (
          <LinearGradient
            colors={brandGradient.colors}
            locations={brandGradient.locations}
            start={brandGradient.start}
            end={brandGradient.end}
            style={styles.avatar}
          >
            {initials ? (
              <Text style={styles.initials}>{initials}</Text>
            ) : (
              <MaterialCommunityIcons name="account" size={22} color={colors.onPrimary} />
            )}
          </LinearGradient>
        )}
      </AppPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: 2 },
  date: { fontFamily: fonts.bodyMedium, fontSize: 11, letterSpacing: 0.8, color: colors.outline },
  greeting: { fontFamily: fonts.titleSemiBold, fontSize: 26, lineHeight: 32, color: colors.onSurface },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5252A',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 10, lineHeight: 12, color: colors.onPrimary },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onPrimary },
});
