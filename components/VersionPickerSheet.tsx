import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { languageName } from '../lib/bibleVersions';
import { colors, fonts, radius, spacing } from '../theme/tokens';
import type { BibleVersionMeta } from '../types/bible';

interface Props {
  visible: boolean;
  versions: BibleVersionMeta[];
  selectedCode: string;
  /** Code of the version being loaded, if any. */
  loadingCode?: string | null;
  /** Switches the version; resolves `true` when it was applied. The sheet closes on success. */
  onSelect: (code: string) => Promise<boolean>;
  onClose: () => void;
}

/** Extra information shown under a version when it differs from a regular, complete Bible. */
function versionNote(version: BibleVersionMeta): string | null {
  const notes: string[] = [];
  if (version.scope === 'ot') notes.push('Somente Antigo Testamento');
  if (version.deuterocanon) notes.push('Inclui livros deuterocanônicos');
  if (version.numbering === 'vulgate') notes.push('Salmos na numeração da Vulgata');
  return notes.length > 0 ? notes.join(' · ') : null;
}

/** Versions grouped by language, in registry order (Portuguese first). */
function groupByLanguage(versions: BibleVersionMeta[]): { language: string; items: BibleVersionMeta[] }[] {
  const groups: { language: string; items: BibleVersionMeta[] }[] = [];
  for (const version of versions) {
    const language = languageName(version.language);
    const group = groups.find((item) => item.language === language);
    if (group) group.items.push(version);
    else groups.push({ language, items: [version] });
  }
  return groups;
}

export function VersionPickerSheet({ visible, versions, selectedCode, loadingCode = null, onSelect, onClose }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} heightRatio={0.7}>
      <View style={styles.header}>
        <Text style={styles.title}>Versão da Bíblia</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8}>
          <MaterialCommunityIcons name="close" size={22} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {groupByLanguage(versions).map((group) => (
          <View key={group.language} style={styles.group}>
            <Text style={styles.groupTitle}>{group.language}</Text>
            {group.items.map((version) => {
              const selected = version.code === selectedCode;
              const loading = version.code === loadingCode;
              const note = versionNote(version);
              return (
                <Pressable
                  key={version.code}
                  disabled={loadingCode !== null}
                  onPress={async () => {
                    if (await onSelect(version.code)) onClose();
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, busy: loading }}
                  style={[styles.row, selected && styles.rowSelected]}
                >
                  <View style={styles.texts}>
                    <Text style={styles.name}>{version.name}</Text>
                    <Text style={styles.meta}>
                      {version.label}
                      {version.year ? ` · ${version.year}` : ''}
                    </Text>
                    {note ? <Text style={styles.note}>{note}</Text> : null}
                  </View>
                  {loading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : selected ? (
                    <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { fontFamily: fonts.titleSemiBold, fontSize: 22, color: colors.onSurface },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  group: { gap: spacing.sm },
  groupTitle: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.6, color: colors.outline, textTransform: 'uppercase', marginTop: spacing.xs },
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
  note: { fontFamily: fonts.body, fontSize: 11, color: colors.primary },
});
