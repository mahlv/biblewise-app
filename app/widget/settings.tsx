import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWidgetSettings } from '../../hooks/useWidgetSettings';
import { getQuoteForDate } from '../../lib/widgetQuotes';
import { WIDGET_BACKGROUNDS, WIDGET_FONTS, getWidgetBackground, getWidgetFont } from '../../lib/widgetStyle';
import { requestPinWidgetPrompt } from '../../lib/widgetSync';
import { colors, fonts, radius, shadow, spacing } from '../../theme/tokens';

type PreviewSize = 'small' | 'medium';

const ADD_INSTRUCTIONS =
  Platform.OS === 'ios'
    ? 'Mantenha pressionada a tela inicial, toque em “+” e escolha Biblewise.'
    : 'Mantenha pressionado um espaço vazio da tela inicial, toque em Widgets e escolha Biblewise.';

function statusText(enabled: boolean, placed: boolean | null): string {
  if (!enabled) return 'Pausado: o widget mostra um aviso até você reativá-lo.';
  if (placed === true) return 'Ativo na sua tela inicial.';
  if (placed === false) return 'Ainda não foi adicionado à tela inicial.';
  return 'Ativo. Adicione-o à tela inicial para vê-lo.';
}

/** Customize the home-screen widget: look, on/off and adding it to the home screen. */
export default function WidgetSettingsScreen() {
  const { settings, placed, loaded, update } = useWidgetSettings();
  const scheme = useColorScheme();
  const [previewSize, setPreviewSize] = useState<PreviewSize>('medium');

  const background = getWidgetBackground(settings.backgroundId);
  const look = scheme === 'dark' && background.dark ? background.dark : background.light;
  const font = getWidgetFont(settings.fontId);
  const quote = useMemo(() => getQuoteForDate(new Date()), []);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  const handleAdd = async () => {
    if (await requestPinWidgetPrompt()) return;
    Alert.alert('Adicionar à tela inicial', ADD_INSTRUCTIONS);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.headerButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Widget</Text>
        <View style={styles.headerButton} />
      </View>

      {!loaded ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.previewArea}>
            <LinearGradient
              colors={[look.from, look.to]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.preview, previewSize === 'small' ? styles.previewSmall : styles.previewMedium, !settings.enabled && styles.previewPaused]}
            >
              <View style={styles.previewBody}>
                <Text
                  numberOfLines={previewSize === 'small' ? 6 : 4}
                  style={[styles.previewQuote, { color: look.text, fontFamily: font.family, fontSize: previewSize === 'small' ? 14 : 17 }]}
                >
                  “{quote.text}”
                </Text>
              </View>
              <View style={styles.previewFooter}>
                <Text
                  numberOfLines={1}
                  style={[styles.previewAuthor, { color: look.muted }, previewSize === 'small' && { textAlign: 'center' }]}
                >
                  {quote.author}
                </Text>
                {previewSize === 'medium' ? (
                  <View style={[styles.previewButton, { backgroundColor: look.button }]}>
                    <MaterialCommunityIcons name="book-open-page-variant" size={16} color={look.buttonIcon} />
                  </View>
                ) : null}
              </View>
            </LinearGradient>

            <View style={styles.sizeToggle}>
              {(['small', 'medium'] as const).map((size) => (
                <Pressable
                  key={size}
                  onPress={() => setPreviewSize(size)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: previewSize === size }}
                  style={[styles.sizeChip, previewSize === size && styles.sizeChipSelected]}
                >
                  <Text style={[styles.sizeChipText, previewSize === size && styles.sizeChipTextSelected]}>
                    {size === 'small' ? 'Pequeno' : 'Médio'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchTexts}>
                <Text style={styles.cardTitle}>Widget ativo</Text>
                <Text style={styles.cardBody}>{statusText(settings.enabled, placed)}</Text>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={(enabled) => update({ enabled })}
                trackColor={{ false: colors.outlineVariant, true: colors.primary }}
                thumbColor={colors.onPrimary}
                accessibilityLabel="Widget ativo"
              />
            </View>

            <Pressable
              onPress={handleAdd}
              accessibilityRole="button"
              style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.85 }]}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.addButtonText}>{placed ? 'Adicionar outro à tela inicial' : 'Adicionar à tela inicial'}</Text>
            </Pressable>
            <Text style={styles.hint}>
              Para remover o widget, mantenha-o pressionado na tela inicial e escolha remover. Desativar aqui apenas o pausa.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fundo</Text>
            <View style={styles.swatches}>
              {WIDGET_BACKGROUNDS.map((item) => {
                const itemLook = item.light;
                const selected = item.id === settings.backgroundId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => update({ backgroundId: item.id })}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected }}
                    style={styles.swatchItem}
                  >
                    <View style={[styles.swatchRing, selected && styles.swatchRingSelected]}>
                      <LinearGradient
                        colors={[itemLook.from, itemLook.to]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.swatch}
                      />
                    </View>
                    <Text style={[styles.swatchLabel, selected && styles.swatchLabelSelected]} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fonte</Text>
            <View style={styles.fontList}>
              {WIDGET_FONTS.map((item) => {
                const selected = item.id === settings.fontId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => update({ fontId: item.id })}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.fontChip, selected && styles.fontChipSelected]}
                  >
                    <Text style={[styles.fontChipText, { fontFamily: item.family }, selected && styles.fontChipTextSelected]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.titleSemiBold, fontSize: 22, color: colors.onSurface },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xxl },
  previewArea: { alignItems: 'center', gap: spacing.md },
  preview: { borderRadius: radius.lg, padding: spacing.lg, justifyContent: 'space-between', ...shadow },
  previewSmall: { width: 160, height: 160 },
  previewMedium: { width: '100%', height: 160 },
  previewPaused: { opacity: 0.4 },
  previewBody: { flex: 1, justifyContent: 'center' },
  previewQuote: { lineHeight: 22, textAlign: 'center' },
  previewFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  previewAuthor: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  previewButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sizeToggle: { flexDirection: 'row', gap: spacing.sm },
  sizeChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  sizeChipSelected: { backgroundColor: colors.selectedContainer, borderColor: colors.primary },
  sizeChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.onSurfaceVariant },
  sizeChipTextSelected: { fontFamily: fonts.bodySemiBold, color: colors.primary },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadow },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchTexts: { flex: 1, gap: 2 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onSurface },
  cardBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.onSurfaceVariant },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainer,
  },
  addButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primary },
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.outline },
  section: { gap: spacing.md },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.onSurface },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  swatchItem: { width: 72, alignItems: 'center', gap: 6 },
  swatchRing: { padding: 3, borderRadius: 32, borderWidth: 2, borderColor: 'transparent' },
  swatchRingSelected: { borderColor: colors.primary },
  swatch: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.outlineVariant },
  swatchLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.onSurfaceVariant },
  swatchLabelSelected: { fontFamily: fonts.bodySemiBold, color: colors.primary },
  fontList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fontChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
  },
  fontChipSelected: { backgroundColor: colors.selectedContainer, borderColor: colors.primary },
  fontChipText: { fontSize: 16, color: colors.onSurfaceVariant },
  fontChipTextSelected: { color: colors.primary },
});
