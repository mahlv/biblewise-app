import type { Ref } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getBackground,
  getFont,
  getFormat,
  getSize,
  quoteBaseFontSize,
  withQuoteMarks,
  type QuoteStyle,
} from '../lib/quoteStyle';
import { fonts } from '../theme/tokens';

/** Reference width the sizes below were designed for; everything scales from it. */
const DESIGN_WIDTH = 350;

interface Props {
  quote: string;
  /** "PR. ROBERTO SILVA"; hidden when empty. */
  attribution?: string;
  /** "20 OUT 2024" */
  dateLabel: string;
  style: QuoteStyle;
  /** Rendered width in px; height follows the chosen format. */
  width: number;
  /** Ref of the root view, used to capture the art as an image. */
  captureRef?: Ref<View>;
}

/** The shareable quote art. Self-contained so the same component is the preview and the exported image. */
export function QuoteCard({ quote, attribution, dateLabel, style, width, captureRef }: Props) {
  const background = getBackground(style.backgroundId);
  const font = getFont(style.fontId);
  const format = getFormat(style.formatId);
  const size = getSize(style.sizeId);

  const scale = width / DESIGN_WIDTH;
  const height = width / format.aspectRatio;
  const text = withQuoteMarks(quote);
  const fontSize = quoteBaseFontSize(text.length) * size.scale * scale * (format.id === 'story' ? 1.1 : 1);
  const unit = (value: number) => value * scale;

  return (
    <View ref={captureRef} collapsable={false} style={{ width, height, borderRadius: unit(32), overflow: 'hidden' }}>
      <LinearGradient colors={background.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* Soft decorative glows (plain circles, no blur dependency). */}
      <View style={[styles.glow, { top: -unit(60), right: -unit(40), width: unit(220), height: unit(220), borderRadius: unit(110), backgroundColor: background.chip }]} />
      <View style={[styles.glow, { bottom: -unit(80), left: -unit(60), width: unit(260), height: unit(260), borderRadius: unit(130), backgroundColor: background.chip, opacity: 0.6 }]} />

      <View style={[styles.datePill, { top: unit(18), right: unit(18), paddingHorizontal: unit(14), paddingVertical: unit(5), borderRadius: unit(14), backgroundColor: background.chip }]}>
        <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: unit(11), letterSpacing: unit(1), color: background.muted }}>{dateLabel}</Text>
      </View>

      <View style={[styles.center, { paddingHorizontal: unit(32), paddingTop: unit(48), paddingBottom: unit(72) }]}>
        <Text style={{ fontFamily: font.family, fontSize, lineHeight: fontSize * 1.38, color: background.text, textAlign: 'center' }}>{text}</Text>
        {attribution ? (
          <Text style={{ marginTop: unit(22), fontFamily: fonts.bodyMedium, fontSize: unit(12), letterSpacing: unit(1), color: background.muted, textAlign: 'center' }}>
            {`— ${attribution.toUpperCase()}`}
          </Text>
        ) : null}
      </View>

      <View style={[styles.brand, { left: unit(24), bottom: unit(22), gap: unit(10) }]}>
        <Image source={require('../assets/bw-logo.png')} style={{ width: unit(38), height: unit(38) }} resizeMode="contain" />
        <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: unit(12), letterSpacing: unit(1.2), color: background.muted }}>BIBLEWISE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute' },
  datePill: { position: 'absolute' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brand: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
});
