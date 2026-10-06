import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme/tokens';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onPressMic: () => void;
}

export function BibleSearchBar({ value, onChangeText, onSubmit, onPressMic }: Props) {
  return (
    <View style={styles.bar}>
      <MaterialCommunityIcons name="magnify" size={20} color={colors.outline} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder="Digite livro, capítulo ou versículo (ex: Gên..."
        placeholderTextColor={colors.outline}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="words"
        style={styles.input}
        accessibilityLabel="Buscar passagem"
      />
      <Pressable onPress={onPressMic} accessibilityRole="button" accessibilityLabel="Busca por voz" hitSlop={8}>
        <MaterialCommunityIcons name="microphone-outline" size={20} color={colors.outline} />
      </Pressable>
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
