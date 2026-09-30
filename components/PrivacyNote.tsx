import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { IconName } from './OnboardingOption';
import { colors, fonts, spacing } from '../theme/tokens';

interface Props {
  text: string;
  icon?: IconName;
}

/** Footer line with a green icon (privacy / terms). */
export function PrivacyNote({ text, icon = 'shield-check' }: Props) {
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.tertiary} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  text: {
    flexShrink: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
