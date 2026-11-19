import { useState, type ReactNode } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, shadow, spacing } from '../theme/tokens';

// LayoutAnimation is opt-in on Android.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  title: string;
  /** Number of items inside, shown as a small badge. */
  count?: number;
  /** One-line preview shown while collapsed, followed by "Ler mais". */
  teaser?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** A card that shows a title, count and teaser, and opens to reveal its content. */
export function CollapsibleSection({ title, count, teaser, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((current) => !current);
  };

  return (
    <View style={styles.card}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`${open ? 'Recolher' : 'Expandir'} ${title}`}
        accessibilityState={{ expanded: open }}
        style={styles.header}
      >
        <View style={styles.headerTexts}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {count !== undefined ? (
              <View style={styles.count}>
                <Text style={styles.countText}>{count}</Text>
              </View>
            ) : null}
          </View>
          {!open && teaser ? (
            <Text style={styles.teaser} numberOfLines={1}>
              {teaser} <Text style={styles.readMore}>Ler mais</Text>
            </Text>
          ) : null}
        </View>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={26} color={colors.primary} />
      </Pressable>

      {open ? (
        <View style={styles.content}>
          {children}
          <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={`Recolher ${title}`} hitSlop={8}>
            <Text style={styles.readLess}>Mostrar menos</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, overflow: 'hidden', ...shadow },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  headerTexts: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: fonts.titleSemiBold, fontSize: 22, color: colors.onSurface },
  count: { minWidth: 24, height: 22, borderRadius: 11, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.selectedIconContainer },
  countText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },
  teaser: { fontFamily: fonts.body, fontSize: 13, color: colors.onSurfaceVariant },
  readMore: { fontFamily: fonts.bodySemiBold, color: colors.primary },
  content: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  readLess: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primary, textAlign: 'center', paddingTop: spacing.xs },
});
