import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useToast } from '../../hooks/useToast';
import { colors, fonts, radius, spacing } from '../../theme/tokens';

interface Props {
  quote: string;
  reference: string;
  favorite: boolean;
  bookmarked: boolean;
  onToggleFavorite: () => void;
  onToggleBookmark: () => void;
}

const CARD_GRADIENT = ['#7A2E1C', '#4A1D12', '#2A1410'] as const;

/** "Frase do Dia": dark card with the daily verse, share and favorite/bookmark actions. */
export function DailyQuoteCard({ quote, reference, favorite, bookmarked, onToggleFavorite, onToggleBookmark }: Props) {
  const toast = useToast();

  const handleShare = () => {
    Share.share({ message: `“${quote}”\n— ${reference}` }).catch(() => undefined);
  };

  return (
    <LinearGradient colors={CARD_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="star-four-points" size={12} color={colors.onPrimary} />
          <Text style={styles.badgeText}>FRASE DO DIA</Text>
        </View>
        <Pressable
          onPress={() => toast('Em breve')}
          accessibilityRole="button"
          accessibilityLabel="Ouvir versículo"
          style={styles.roundButton}
        >
          <MaterialCommunityIcons name="volume-high" size={18} color={colors.onPrimary} />
        </Pressable>
      </View>

      <Text style={styles.quote}>“{quote}”</Text>
      <Text style={styles.reference}>{reference}</Text>

      <View style={styles.bottomRow}>
        <Pressable
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="Compartilhar"
          style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.85 }]}
        >
          <MaterialCommunityIcons name="share-variant-outline" size={18} color={colors.onSurface} />
          <Text style={styles.shareText}>Compartilhar</Text>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            onPress={onToggleFavorite}
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Favoritar'}
            accessibilityState={{ selected: favorite }}
            style={styles.roundButton}
          >
            <MaterialCommunityIcons
              name={favorite ? 'heart' : 'heart-outline'}
              size={20}
              color={favorite ? '#FF6B8A' : colors.onPrimary}
            />
          </Pressable>
          <Pressable
            onPress={onToggleBookmark}
            accessibilityRole="button"
            accessibilityLabel={bookmarked ? 'Remover dos salvos' : 'Salvar'}
            accessibilityState={{ selected: bookmarked }}
            style={styles.roundButton}
          >
            <MaterialCommunityIcons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={bookmarked ? colors.badge : colors.onPrimary}
            />
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  badgeText: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.6, color: colors.onPrimary },
  roundButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  quote: { fontFamily: fonts.verseItalic, fontSize: 26, lineHeight: 36, color: colors.onPrimary, marginTop: spacing.sm },
  reference: { fontFamily: fonts.body, fontSize: 16, color: 'rgba(255,255,255,0.75)' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.onPrimary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  shareText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.onSurface },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
