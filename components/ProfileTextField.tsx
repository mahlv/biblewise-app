import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme/tokens';

interface Props extends Pick<TextInputProps, 'keyboardType' | 'autoCapitalize' | 'autoComplete' | 'maxLength'> {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string | null;
}

/** Labelled text input in the app's card style. */
export function ProfileTextField({ label, value, onChangeText, placeholder, error, ...inputProps }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.outline}
        accessibilityLabel={label}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.onSurfaceVariant },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  inputError: { borderColor: colors.primary },
  error: { fontFamily: fonts.body, fontSize: 12, color: colors.primary },
});
