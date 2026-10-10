import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { QuoteCard } from './QuoteCard';
import { useToast } from '../hooks/useToast';
import {
  QUOTE_BACKGROUNDS,
  QUOTE_FONTS,
  QUOTE_FORMATS,
  QUOTE_SIZES,
  getFormat,
  type QuoteStyle,
} from '../lib/quoteStyle';
import { colors, fonts, radius, spacing } from '../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  quote: string;
  attribution?: string;
  dateLabel: string;
  style: QuoteStyle;
  onChangeStyle: (style: QuoteStyle) => void;
}

const EXPORT_WIDTH = 1080;
const UPDATE_MESSAGE = 'Atualize o app (nova build) para compartilhar a arte';

/** Customize the quote art (background, font, size, format) and share or save it as an image. */
export function QuoteShareSheet({ visible, onClose, quote, attribution, dateLabel, style, onChangeStyle }: Props) {
  const toast = useToast();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);

  const format = getFormat(style.formatId);
  // Fit the preview in the sheet: limit by width and by about half of the screen height.
  const previewWidth = Math.min(screenWidth - spacing.xl * 2, (screenHeight * 0.5) * format.aspectRatio, 340);

  const update = (patch: Partial<QuoteStyle>) => onChangeStyle({ ...style, ...patch });

  /** Renders the card to a PNG in the cache. Native modules are loaded lazily so older builds don't crash. */
  const capture = async (): Promise<string | null> => {
    if (!requireOptionalNativeModule('RNViewShot')) {
      toast(UPDATE_MESSAGE);
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { captureRef } = require('react-native-view-shot') as typeof import('react-native-view-shot');
    return await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile', width: EXPORT_WIDTH });
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy('share');
    try {
      if (!requireOptionalNativeModule('ExpoSharing')) {
        toast(UPDATE_MESSAGE);
        return;
      }
      const uri = await capture();
      if (!uri) return;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sharing = require('expo-sharing') as typeof import('expo-sharing');
      if (!(await Sharing.isAvailableAsync())) {
        toast('Compartilhamento indisponível neste aparelho');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar frase', UTI: 'public.png' });
    } catch {
      toast('Não foi possível compartilhar agora');
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    if (busy) return;
    setBusy('save');
    try {
      if (!requireOptionalNativeModule('ExpoMediaLibrary')) {
        toast(UPDATE_MESSAGE);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const MediaLibrary = require('expo-media-library') as typeof import('expo-media-library');
      // Write-only access is enough to save an image.
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        toast('Permita o acesso à galeria para baixar a imagem');
        return;
      }
      const uri = await capture();
      if (!uri) return;
      await MediaLibrary.saveToLibraryAsync(uri);
      toast('Imagem salva na galeria');
    } catch {
      toast('Não foi possível salvar a imagem');
    } finally {
      setBusy(null);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} heightRatio={0.94}>
      <View style={styles.header}>
        <Text style={styles.title}>Customizar Arte</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" style={styles.close}>
          <MaterialCommunityIcons name="close" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.preview}>
          <QuoteCard quote={quote} attribution={attribution} dateLabel={dateLabel} style={style} width={previewWidth} captureRef={cardRef} />
        </View>

        <Text style={styles.label}>FORMATO</Text>
        <View style={styles.row} accessibilityRole="radiogroup">
          {QUOTE_FORMATS.map((item) => (
            <Chip key={item.id} label={item.label} selected={item.id === style.formatId} onPress={() => update({ formatId: item.id })} />
          ))}
        </View>

        <Text style={styles.label}>FUNDO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatches}>
          {QUOTE_BACKGROUNDS.map((item) => {
            const selected = item.id === style.backgroundId;
            return (
              <Pressable
                key={item.id}
                onPress={() => update({ backgroundId: item.id })}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`Fundo ${item.label}`}
                style={[styles.swatchRing, selected && styles.swatchRingSelected]}
              >
                <LinearGradient colors={item.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatch} />
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>FONTE</Text>
        <View style={styles.rowWrap} accessibilityRole="radiogroup">
          {QUOTE_FONTS.map((item) => (
            <Chip key={item.id} label={item.label} fontFamily={item.family} selected={item.id === style.fontId} onPress={() => update({ fontId: item.id })} />
          ))}
        </View>

        <Text style={styles.label}>TAMANHO DO TEXTO</Text>
        <View style={styles.row} accessibilityRole="radiogroup">
          {QUOTE_SIZES.map((item) => (
            <Chip key={item.id} label={item.label} selected={item.id === style.sizeId} onPress={() => update({ sizeId: item.id })} />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={handleShare} disabled={busy !== null} accessibilityRole="button" accessibilityLabel="Compartilhar" style={styles.flex}>
          <LinearGradient colors={['#E8265E', '#F7568A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButton}>
            {busy === 'share' ? <ActivityIndicator color={colors.onPrimary} /> : <MaterialCommunityIcons name="share-variant" size={18} color={colors.onPrimary} />}
            <Text style={styles.primaryText}>Compartilhar</Text>
          </LinearGradient>
        </Pressable>
        <Pressable onPress={handleSave} disabled={busy !== null} accessibilityRole="button" accessibilityLabel="Baixar imagem" style={styles.secondaryButton}>
          {busy === 'save' ? <ActivityIndicator color={colors.primary} /> : <MaterialCommunityIcons name="download" size={20} color={colors.primary} />}
          <Text style={styles.secondaryText}>Baixar</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

function Chip({ label, selected, onPress, fontFamily }: { label: string; selected: boolean; onPress: () => void; fontFamily?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, fontFamily ? { fontFamily } : null, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  title: { fontFamily: fonts.titleSemiBold, fontSize: 24, color: colors.onSurface },
  close: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.sm },
  preview: { alignItems: 'center', paddingVertical: spacing.md },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 1, color: colors.onSurfaceVariant, marginTop: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatches: { gap: spacing.md, paddingVertical: 4 },
  swatchRing: { padding: 3, borderRadius: 24, borderWidth: 2, borderColor: 'transparent' },
  swatchRingSelected: { borderColor: colors.primary },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  chip: { backgroundColor: colors.surfaceContainer, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 9, minWidth: 48, alignItems: 'center' },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.onSurface },
  chipTextSelected: { color: colors.onPrimary },
  footer: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl },
  flex: { flex: 1 },
  primaryButton: { height: 52, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  primaryText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },
  secondaryButton: { height: 52, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.primary, paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  secondaryText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primary },
});
