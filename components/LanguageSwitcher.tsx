import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from './BottomSheet';
import { AppPressable } from './ui/AppPressable';
import { changeLanguage, currentLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from '../lib/i18n';
import { colors, fonts, radius, spacing } from '../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called after the language was applied (e.g. to confirm a restart for right-to-left languages). */
  onChanged?: (code: LanguageCode) => void;
}

/** Native name of the language in use ("Português"), for the settings row. */
export function currentLanguageName(): string {
  const code = currentLanguage();
  return SUPPORTED_LANGUAGES.find((language) => language.code === code)?.nativeName ?? code;
}

/** Bottom sheet listing the app's languages; picking one switches the whole UI instantly. */
export function LanguageSwitcher({ visible, onClose, onChanged }: Props) {
  const { t, i18n } = useTranslation();
  const selected = currentLanguage();

  const select = async (code: LanguageCode) => {
    if (code !== selected) {
      await changeLanguage(code);
      onChanged?.(code);
    }
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} heightRatio={0.7}>
      <View style={styles.header}>
        <View style={styles.headerTexts}>
          <Text style={styles.title}>{t('language.title')}</Text>
          <Text style={styles.description}>{t('language.description')}</Text>
        </View>
        <AppPressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={22} color={colors.onSurfaceVariant} />
        </AppPressable>
      </View>
      <ScrollView contentContainerStyle={styles.list} key={i18n.language}>
        {SUPPORTED_LANGUAGES.map((language) => {
          const isSelected = language.code === selected;
          return (
            <AppPressable
              haptic="selection"
              key={language.code}
              onPress={() => void select(language.code)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLanguage={language.code}
              style={[styles.row, isSelected && styles.rowSelected]}
            >
              <Text style={styles.name}>{language.nativeName}</Text>
              {isSelected ? <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} /> : null}
            </AppPressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  headerTexts: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.titleSemiBold, fontSize: 22, color: colors.onSurface },
  description: { fontFamily: fonts.body, fontSize: 13, color: colors.onSurfaceVariant },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowSelected: { borderColor: colors.primary },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.onSurface },
});
