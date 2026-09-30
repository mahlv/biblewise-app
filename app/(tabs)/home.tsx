import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '../../components/BrandLogo';
import { useOnboarding } from '../../hooks/useOnboarding';
import { BibleSearchScreen } from '../../screens/BibleSearchScreen';
import { colors, fonts, radius, spacing } from '../../theme/tokens';

/**
 * Temporary Home ("em construção").
 *
 * Keeps the existing verse search reachable and offers "Refazer onboarding"
 * for testing: it only clears the local flag; the `anonymousId` is preserved,
 * so redoing the flow updates the same Convex user.
 */
export default function HomeScreen() {
  const { reset, anonymousId } = useOnboarding();
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    // The root layout guard takes the user back to Welcome.
    await reset();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.notice}>
        <BrandLogo size={32} />
        <View style={styles.noticeTexts}>
          <Text style={styles.noticeTitle}>Home em construção</Text>
          <Text style={styles.noticeDetail} numberOfLines={1}>
            Usuário anônimo: {anonymousId ?? '—'}
          </Text>
        </View>
        <Pressable
          onPress={handleReset}
          disabled={resetting}
          accessibilityRole="button"
          accessibilityLabel="Refazer onboarding"
          style={({ pressed }) => [styles.resetButton, (pressed || resetting) && styles.pressed]}
        >
          <Text style={styles.resetButtonText}>Refazer onboarding</Text>
        </Pressable>
      </View>

      <BibleSearchScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  noticeTexts: {
    flex: 1,
  },
  noticeTitle: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 18,
    color: colors.onSurface,
  },
  noticeDetail: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.outline,
  },
  resetButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  resetButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.onPrimary,
  },
});
