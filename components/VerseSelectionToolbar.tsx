import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { IconName } from './OnboardingOption';
import { colors, fonts, radius, spacing } from '../theme/tokens';
import { AppPressable } from './ui/AppPressable';

interface Props {
  verse: number;
  onCopy: () => void;
  onHighlight: () => void;
  onNote: () => void;
  onShare: () => void;
}

/** Pill shown only while a verse is selected. */
export function VerseSelectionToolbar({ verse, onCopy, onHighlight, onNote, onShare }: Props) {
  const { t } = useTranslation();
  const actions: { icon: IconName; label: string; onPress: () => void; tint?: string }[] = [
    { icon: 'content-copy', label: t('bible.selection.copy'), onPress: onCopy },
    { icon: 'marker', label: t('bible.selection.highlight'), onPress: onHighlight, tint: '#F7F052' },
    { icon: 'note-edit-outline', label: t('bible.selection.note'), onPress: onNote },
    { icon: 'share-variant', label: t('bible.selection.share'), onPress: onShare },
  ];

  return (
    <View style={styles.pill} accessibilityRole="toolbar">
      <Text style={styles.label}>{t('bible.selection.selected', { verse })}</Text>
      {actions.map((action) => (
        <AppPressable key={action.label} onPress={action.onPress} accessibilityRole="button" accessibilityLabel={action.label} hitSlop={6}>
          <MaterialCommunityIcons name={action.icon} size={18} color={action.tint ?? colors.onPrimary} />
        </AppPressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F22D56',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.onPrimary },
});
