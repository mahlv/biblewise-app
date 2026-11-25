import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PRAYER_LIMITS } from '../lib/prayerCategories';
import { colors, fonts, radius, spacing } from '../theme/tokens';
import { AppPressable } from './ui/AppPressable';

interface Props {
  /** Sends the text; reject to keep it in the box (the screen shows the error). */
  onSubmit: (text: string) => Promise<void>;
}

/** Input bar to write a comment, with a send button and a counter near the limit. */
export function CommentComposer({ onSubmit }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const canSend = text.trim().length > 0 && !sending;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await onSubmit(text);
      setText('');
    } catch {
      // The screen reports the error; keep what the user typed.
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.bar}>
      <View style={styles.inputWrapper}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escreva um comentário..."
          placeholderTextColor={colors.outline}
          multiline
          maxLength={PRAYER_LIMITS.comment}
          accessibilityLabel="Escreva um comentário"
          style={styles.input}
        />
        {text.length > PRAYER_LIMITS.comment - 100 ? (
          <Text style={styles.counter}>
            {text.length}/{PRAYER_LIMITS.comment}
          </Text>
        ) : null}
      </View>
      <AppPressable
        onPress={send}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Enviar comentário"
        style={({ pressed }) => [styles.send, !canSend && styles.sendDisabled, pressed && { opacity: 0.85 }]}
      >
        {sending ? <ActivityIndicator color={colors.onPrimary} /> : <MaterialCommunityIcons name="send" size={20} color={colors.onPrimary} />}
      </AppPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.lg,
    paddingTop: 6,
    paddingBottom: 6,
  },
  input: { maxHeight: 110, minHeight: 36, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.onSurface, paddingVertical: 6 },
  counter: { alignSelf: 'flex-end', fontFamily: fonts.body, fontSize: 11, color: colors.outline },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  sendDisabled: { opacity: 0.4 },
});
