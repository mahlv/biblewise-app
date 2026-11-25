import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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
import { AppPressable } from './ui/AppPressable';

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

/** True when the error means a native module is missing from this build. */
const isMissingModule = (error: unknown) => /cannot find native module|could not be found|is undefined|null is not an object|undefined is not an object/i.test(String(error instanceof Error ? error.message : error));

/** Ensures a local path is a file:// URI, as the sharing and gallery modules expect. */
const toFileUri = (uri: string) => (uri.startsWith('file://') ? uri : `file://${uri}`);

/** Logs the real cause in development so Metro shows it. */
const logError = (label: string, error: unknown) => {
  if (__DEV__) console.warn(label, error);
};

/** Customize the quote art (background, font, size, format) and share or save it as an image. */
function QuoteShareContent({ onClose, quote, attribution, dateLabel, style, onChangeStyle }: Omit<Props, 'visible'>) {
  const toast = useToast();
  const { t } = useTranslation();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);

  const format = getFormat(style.formatId);
  // Fit the preview in the sheet: limit by width and by about half of the screen height.
  const previewWidth = Math.min(screenWidth - spacing.xl * 2, (screenHeight * 0.5) * format.aspectRatio, 340);

  const update = (patch: Partial<QuoteStyle>) => onChangeStyle({ ...style, ...patch });

  /** Renders the card to a PNG in the cache. The native module is loaded lazily so older builds don't crash on import. */
  const capture = async (): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { captureRef } = require('react-native-view-shot') as typeof import('react-native-view-shot');
    const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile', width: EXPORT_WIDTH });
    return toFileUri(uri);
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy('share');
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sharing = require('expo-sharing') as typeof import('expo-sharing');
      if (!(await Sharing.isAvailableAsync())) {
        toast(t('quote.shareUnavailable'));
        return;
      }
      const uri = await capture();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('quote.shareDialog'), UTI: 'public.png' });
    } catch (error) {
      logError('Quote share failed', error);
      toast(isMissingModule(error) ? t('quote.updateNeeded') : t('quote.shareFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    if (busy) return;
    setBusy('save');
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const MediaLibrary = require('expo-media-library') as typeof import('expo-media-library');
      // Write-only access is enough to save an image.
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        toast(t('quote.galleryPermission'));
        return;
      }
      const uri = await capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      toast(t('quote.saved'));
    } catch (error) {
      logError('Quote save failed', error);
      toast(isMissingModule(error) ? t('quote.updateNeeded') : t('quote.saveFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{t('quote.title')}</Text>
        <AppPressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.close}>
          <MaterialCommunityIcons name="close" size={18} color={colors.primary} />
        </AppPressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.preview}>
          <QuoteCard quote={quote} attribution={attribution} dateLabel={dateLabel} style={style} width={previewWidth} captureRef={cardRef} />
        </View>

        <Text style={styles.label}>{t('quote.format')}</Text>
        <View style={styles.row} accessibilityRole="radiogroup">
          {QUOTE_FORMATS.map((item) => (
            <Chip key={item.id} label={t(item.labelKey)} selected={item.id === style.formatId} onPress={() => update({ formatId: item.id })} />
          ))}
        </View>

        <Text style={styles.label}>{t('quote.background')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatches}>
          {QUOTE_BACKGROUNDS.map((item) => {
            const selected = item.id === style.backgroundId;
            return (
              <AppPressable haptic="selection"
                key={item.id}
                onPress={() => update({ backgroundId: item.id })}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={t('quote.backgroundLabel', { name: t(item.labelKey) })}
                style={[styles.swatchRing, selected && styles.swatchRingSelected]}
              >
                <LinearGradient colors={item.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatch} />
              </AppPressable>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>{t('quote.font')}</Text>
        <View style={styles.rowWrap} accessibilityRole="radiogroup">
          {QUOTE_FONTS.map((item) => (
            <Chip key={item.id} label={t(item.labelKey)} fontFamily={item.family} selected={item.id === style.fontId} onPress={() => update({ fontId: item.id })} />
          ))}
        </View>

        <Text style={styles.label}>{t('quote.textSize')}</Text>
        <View style={styles.row} accessibilityRole="radiogroup">
          {QUOTE_SIZES.map((item) => (
            <Chip key={item.id} label={t(item.labelKey)} selected={item.id === style.sizeId} onPress={() => update({ sizeId: item.id })} />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppPressable onPress={handleShare} disabled={busy !== null} accessibilityRole="button" accessibilityLabel={t('common.share')} style={styles.flex}>
          <LinearGradient colors={['#E8265E', '#F7568A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButton}>
            {busy === 'share' ? <ActivityIndicator color={colors.onPrimary} /> : <MaterialCommunityIcons name="share-variant" size={18} color={colors.onPrimary} />}
            <Text style={styles.primaryText}>{t('common.share')}</Text>
          </LinearGradient>
        </AppPressable>
        <AppPressable onPress={handleSave} disabled={busy !== null} accessibilityRole="button" accessibilityLabel={t('quote.download')} style={styles.secondaryButton}>
          {busy === 'save' ? <ActivityIndicator color={colors.primary} /> : <MaterialCommunityIcons name="download" size={20} color={colors.primary} />}
          <Text style={styles.secondaryText}>{t('quote.downloadShort')}</Text>
        </AppPressable>
      </View>
    </>
  );
}

/** Sheet wrapper: the content is a child so its toasts render inside the Modal. */
export function QuoteShareSheet({ visible, ...rest }: Props) {
  return (
    <BottomSheet visible={visible} onClose={rest.onClose} heightRatio={0.94}>
      <QuoteShareContent {...rest} />
    </BottomSheet>
  );
}

function Chip({ label, selected, onPress, fontFamily }: { label: string; selected: boolean; onPress: () => void; fontFamily?: string }) {
  return (
    <AppPressable haptic="selection" onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, fontFamily ? { fontFamily } : null, selected && styles.chipTextSelected]}>{label}</Text>
    </AppPressable>
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
