import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingHeader } from '../../components/OnboardingHeader';
import { OnboardingOption } from '../../components/OnboardingOption';
import { PrimaryButton } from '../../components/PrimaryButton';
import { PrivacyNote } from '../../components/PrivacyNote';
import { ProgressBar } from '../../components/ProgressBar';
import { useOnboarding } from '../../hooks/useOnboarding';
import { AGE_RANGES } from '../../lib/onboardingOptions';
import { onboardingStyles } from '../../theme/onboardingStyles';

/** Onboarding step 1: age range. */
export default function AgeScreen() {
  const { t } = useTranslation();
  const { draft, setAgeRange } = useOnboarding();

  return (
    <SafeAreaView style={onboardingStyles.screen} edges={['top', 'bottom']}>
      <View style={onboardingStyles.header}>
        <OnboardingHeader onBack={() => router.back()} stepLabel="1/2" />
        {/* Empty until an age range is picked, then fills to step 1 of 2. */}
        <ProgressBar progress={draft.ageRange ? 0.5 : 0} />
      </View>

      <ScrollView contentContainerStyle={onboardingStyles.content} showsVerticalScrollIndicator={false}>
        <Text style={onboardingStyles.title} accessibilityRole="header">
          {t('onboarding.age.title')}
        </Text>
        <Text style={onboardingStyles.subtitle}>
          {t('onboarding.age.subtitle')}
        </Text>

        <View style={onboardingStyles.options} accessibilityRole="radiogroup">
          {AGE_RANGES.map((ageRange) => (
            <OnboardingOption
              key={ageRange}
              variant="display"
              // Typographic en dash, as in the design: "25–34".
              label={ageRange.replace('-', '–')}
              suffix={t('onboarding.age.years')}
              selected={draft.ageRange === ageRange}
              onPress={() => setAgeRange(ageRange)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={onboardingStyles.footer}>
        <PrimaryButton label={t('common.continue')} disabled={!draft.ageRange} onPress={() => router.push('/denomination')} />
        <PrivacyNote text={t('onboarding.privacy')} />
      </View>
    </SafeAreaView>
  );
}
