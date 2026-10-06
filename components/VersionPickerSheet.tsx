import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { colors, fonts, radius, spacing } from '../theme/tokens';
import type { BibleVersionMeta } from '../types/bible';

interface Props {
  visible: boolean;
  versions: BibleVersionMeta[];
  selectedCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export function VersionPickerSheet({ visible, versions, selectedCode, onSelect, onClose }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} heightRatio={0.55}>
      <View style={styles.header}>
        <Text style={styles.title}>Versão da Bíblia</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8}>
          <MaterialCommunityIcons name="close" size={22} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {versions.map((version) => {
          const selected = version.code === selectedCode;
          return (
            <Pressable
              key={version.code}
              onPress={() => {
                onSelect(version.code);
                onClose();
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[styles.row, selected && styles.rowSelected]}
            >
              <View style={styles.texts}>
                <Text style={styles.name}>{version.name}</Text>
                <Text style={styles.meta}>
                  {version.label} · {version.language}
                </Text>
              </View>
              {selected ? <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { fontFamily: fonts.titleSemiBold, fontSize: 22, color: colors.onSurface },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowSelected: { borderColor: colors.primary },
  texts: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.onSurface },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.onSurfaceVariant },
});
