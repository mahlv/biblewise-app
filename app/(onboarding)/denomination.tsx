import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
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
  DENOMINATION_LABELS,
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
      setError('Não foi possível salvar agora. Verifique sua conexão e tente novamente.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={onboardingStyles.screen} edges={['top', 'bottom']}>
      <View style={onboardingStyles.header}>
        <OnboardingHeader onBack={() => router.back()} />
        <View style={styles.progressLegend}>
          <Text style={styles.stepLabel}>ETAPA 2 DE 2</Text>
          <Text style={styles.percentage}>{`${Math.round(progress * 100)}%`}</Text>
        </View>
        <ProgressBar progress={progress} />
      </View>

      <ScrollView contentContainerStyle={onboardingStyles.content} showsVerticalScrollIndicator={false}>
        <Text style={onboardingStyles.title} accessibilityRole="header">
          Qual é a sua denominação?
        </Text>
        <Text style={onboardingStyles.subtitle}>
          Isso nos ajuda a sugerir versões bíblicas e planos de leitura adequados à sua caminhada.
        </Text>

        <View style={onboardingStyles.options} accessibilityRole="radiogroup">
          {DENOMINATIONS.map((denomination) => (
            <OnboardingOption
              key={denomination}
              label={DENOMINATION_LABELS[denomination]}
              icon={DENOMINATION_ICONS[denomination]}
              badge={denomination === DEFAULT_DENOMINATION ? 'Padrão' : undefined}
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
        <PrimaryButton label="Continuar" loading={saving} disabled={!draft.ageRange} onPress={handleComplete} />
        <PrivacyNote text="Sua privacidade é garantida e suas informações permanecerão confidenciais." />
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
