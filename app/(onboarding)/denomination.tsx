import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingHeader } from '../../components/OnboardingHeader';
import { OnboardingOption, type IconName } from '../../components/OnboardingOption';
import { PrimaryButton } from '../../components/PrimaryButton';
import { PrivacyNote } from '../../components/PrivacyNote';
import { ProgressBar } from '../../components/ProgressBar';
import { useOnboarding } from '../../hooks/useOnboarding';
import {
  DEFAULT_DENOMINATION,
  DENOMINATIONS,
  type Denomination,
} from '../../lib/onboardingOptions';
import { colors, fonts } from '../../theme/tokens';
import { onboardingStyles } from '../../theme/onboardingStyles';

const DENOMINATION_ICONS: Record<Denomination, IconName> = {
  catholic: 'church-outline',
  evangelical: 'heart',
  protestant: 'book-open-variant',
  pentecostal: 'fire',
  non_denominational: 'account-group-outline',
  orthodox: 'hands-pray',
  other: 'compass-outline',
};

/** Onboarding step 2: denomination. Completing it saves the anonymous user in Convex. */
export default function DenominationScreen() {
  const { t } = useTranslation();
  const { draft, setDenomination, complete } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Whether the user tapped an option on this step. The pre-selected default
   * does not count, so the bar only completes after an explicit choice.
   */
  const [hasSelected, setHasSelected] = useState(false);
  const progress = hasSelected ? 1 : 0.5;

  const handleSelect = (denomination: Denomination) => {
    setDenomination(denomination);
    setHasSelected(true);
  };

  const handleComplete = async () => {
    setSaving(true);
    setError(null);
    try {
      // Once completed, the root layout guard switches to Home by itself —
      // no `router.replace`, and onboarding is not left in the history.
      await complete();
    } catch {
      setError(t('onboarding.denomination.saveError'));
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={onboardingStyles.screen} edges={['top', 'bottom']}>
      <View style={onboardingStyles.header}>
        <OnboardingHeader onBack={() => router.back()} />
        <View style={styles.progressLegend}>
          <Text style={styles.stepLabel}>{t('onboarding.denomination.step')}</Text>
          <Text style={styles.percentage}>{`${Math.round(progress * 100)}%`}</Text>
        </View>
        <ProgressBar progress={progress} />
      </View>

      <ScrollView contentContainerStyle={onboardingStyles.content} showsVerticalScrollIndicator={false}>
        <Text style={onboardingStyles.title} accessibilityRole="header">
          {t('onboarding.denomination.title')}
        </Text>
        <Text style={onboardingStyles.subtitle}>
          {t('onboarding.denomination.subtitle')}
        </Text>

        <View style={onboardingStyles.options} accessibilityRole="radiogroup">
          {DENOMINATIONS.map((denomination) => (
            <OnboardingOption
              key={denomination}
              label={t(`onboarding.denominations.${denomination}`)}
              icon={DENOMINATION_ICONS[denomination]}
              badge={denomination === DEFAULT_DENOMINATION ? t('onboarding.denomination.default') : undefined}
              selected={draft.denomination === denomination}
              onPress={() => handleSelect(denomination)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={onboardingStyles.footer}>
        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <PrimaryButton label={t('common.continue')} loading={saving} disabled={!draft.ageRange} onPress={handleComplete} />
        <PrivacyNote text={t('onboarding.privacy')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  progressLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  stepLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.primary,
  },
  percentage: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.onSurface,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.primary,
    textAlign: 'center',
  },
});
