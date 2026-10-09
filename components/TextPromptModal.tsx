import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme/tokens';

interface Props {
  visible: boolean;
  title: string;
  placeholder: string;
  initialValue: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

function PromptBody({ title, placeholder, initialValue, onSubmit, onCancel }: Omit<Props, 'visible'>) {
  const [value, setValue] = useState(initialValue);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Cancelar" />
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={colors.outline}
          autoFocus
          maxLength={120}
          returnKeyType="done"
          onSubmitEditing={() => onSubmit(value)}
          style={styles.input}
        />
        <View style={styles.actions}>
          <Pressable onPress={onCancel} accessibilityRole="button" style={styles.cancel}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
          <Pressable onPress={() => onSubmit(value)} accessibilityRole="button" style={styles.confirm}>
            <Text style={styles.confirmText}>Confirmar</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Small centered modal with a single text field. Remounts its body on open so it starts from `initialValue`. */
export function TextPromptModal({ visible, ...rest }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={rest.onCancel} statusBarTranslucent>
      {visible ? <PromptBody {...rest} /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(40,10,10,0.5)' },
  card: { backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
  title: { fontFamily: fonts.titleSemiBold, fontSize: 20, color: colors.onSurface },
  input: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md },
  cancel: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  cancelText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.onSurfaceVariant },
  confirm: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  confirmText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.onPrimary },
});
