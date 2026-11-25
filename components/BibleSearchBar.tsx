import { StyleSheet, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius, spacing } from '../theme/tokens';
import { AppPressable } from './ui/AppPressable';

interface Props {
  value: string;
  /** Hint text; built by the screen so its example uses a book name of the current Bible version. */
  placeholder: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onPressMic: () => void;
}

export function BibleSearchBar({ value, placeholder, onChangeText, onSubmit, onPressMic }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.bar}>
      <MaterialCommunityIcons name="magnify" size={20} color={colors.outline} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.outline}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="words"
        style={styles.input}
        accessibilityLabel={t('bible.search.label')}
      />
      <AppPressable onPress={onPressMic} accessibilityRole="button" accessibilityLabel={t('bible.search.voice')} hitSlop={8}>
        <MaterialCommunityIcons name="microphone-outline" size={20} color={colors.outline} />
      </AppPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.onSurface, paddingVertical: 0 },
});
