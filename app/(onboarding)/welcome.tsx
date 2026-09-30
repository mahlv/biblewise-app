import { useState } from 'react';
import {
  Image,
  PixelRatio,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BrandLogo } from '../../components/BrandLogo';
import type { IconName } from '../../components/OnboardingOption';
import { PrimaryButton } from '../../components/PrimaryButton';
import { PrivacyNote } from '../../components/PrivacyNote';
import { colors, fonts, radius, shadow, spacing } from '../../theme/tokens';

const HERO_IMAGE = require('../../assets/welcomescreen-background.png');

/**
 * Geometry of `welcomescreen-background.png` (768×1376), as fractions of the
 * image height. The watercolor only covers part of the file; above and below
 * it there are plain paper margins that must never be visible.
 */
const HERO_ASPECT_RATIO = 1376 / 768;
const PAINTING_TOP = 0.174;
const PAINTING_BOTTOM = 0.85;
/** Point of interest (the lamb, just below the sun) kept centered in the free space. */
const PAINTING_FOCUS = 0.55;
/** How far the illustration extends behind the top of the content block (it fades out there). */
const HERO_OVERLAP = 48;
/** Height of the fade from the illustration into the page background. */
const FADE_HEIGHT = 150;

/** Reference design width (iPhone 14/15). Sizes scale down on narrower phones. */
const DESIGN_WIDTH = 390;
/** Tighter layout on short or narrow screens, or with large system fonts. */
const COMPACT_MAX_HEIGHT = 760;
const COMPACT_MAX_WIDTH = 370;
const COMPACT_MIN_FONT_SCALE = 1.15;
/** Caps system font scaling on this screen so the no-scroll layout cannot overflow. */
const MAX_FONT_SIZE_MULTIPLIER = 1.2;

interface Benefit {
  icon: IconName;
  title: string;
  description: string;
  tint: string;
  background: string;
}

/** The app's three pillars, shown as cards. */
const BENEFITS: readonly Benefit[] = [
  { icon: 'book-open-page-variant', title: 'Leia', description: 'Bíblia Digital Personalizada', tint: colors.tertiary, background: '#E4F2D9' },
  { icon: 'headphones', title: 'Escute', description: 'Testemunhos Reais', tint: colors.secondary, background: '#DDE8FF' },
  { icon: 'note-edit-outline', title: 'Escreva', description: 'Sua própria História', tint: colors.primary, background: '#FFE0E6' },
];

/**
 * Size and position of the hero image inside a clip box of `heroHeight` px.
 *
 * - "Cover" scaling: the image fills the screen width, and grows further when
 *   the box is taller than the painted area (cropping the sides).
 * - The focus point is placed at `focusY` (middle of the free space between
 *   the top badge and the content), then clamped so only painted pixels are
 *   visible — the paper margins never show.
 */
function getHeroFrame(screenWidth: number, heroHeight: number, focusY: number) {
  const paintingSpan = PAINTING_BOTTOM - PAINTING_TOP;
  const height = Math.max(screenWidth * HERO_ASPECT_RATIO, heroHeight / paintingSpan);
  const width = height / HERO_ASPECT_RATIO;

  const maxTop = -PAINTING_TOP * height;
  const minTop = heroHeight - PAINTING_BOTTOM * height;
  const top = Math.min(maxTop, Math.max(minTop, focusY - PAINTING_FOCUS * height));

  return { width, height, top, left: (screenWidth - width) / 2 };
}

/** Welcome screen — first screen on the first launch. Fills the viewport without scrolling. */
export default function WelcomeScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();
  const isCompact =
    screenHeight < COMPACT_MAX_HEIGHT || screenWidth < COMPACT_MAX_WIDTH || fontScale >= COMPACT_MIN_FONT_SCALE;
  /** Proportional scale for sizes, never larger than the reference design. */
  const scale = Math.min(screenWidth / DESIGN_WIDTH, 1);

  const [topBlockBottom, setTopBlockBottom] = useState<number | null>(null);
  const [contentTop, setContentTop] = useState<number | null>(null);

  const handleTopBlockLayout = (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setTopBlockBottom(y + height);
  };
  const handleContentLayout = (event: LayoutChangeEvent) => {
    setContentTop(event.nativeEvent.layout.y);
  };

  const heroHeight = contentTop === null ? null : contentTop + HERO_OVERLAP;
  const heroFrame =
    heroHeight === null || topBlockBottom === null || contentTop === null
      ? null
      : getHeroFrame(screenWidth, heroHeight, (topBlockBottom + contentTop) / 2);

  const titleSize = Math.round((isCompact ? 28 : 34) * scale);
  const subtitleSize = Math.round((isCompact ? 14 : 16) * scale);

  return (
    <View style={styles.screen}>
      {heroFrame && heroHeight !== null ? (
        // Clip box: nothing of the image is drawn below the fade.
        <View style={[styles.heroClip, { height: heroHeight }]} pointerEvents="none">
          <Image
            source={HERO_IMAGE}
            style={[styles.heroImage, heroFrame]}
            resizeMode="stretch"
            accessibilityIgnoresInvertColors
          />
          <LinearGradient
            colors={[`${colors.background}00`, colors.background]}
            style={[styles.heroFade, { height: Math.min(FADE_HEIGHT, heroHeight / 2) }]}
          />
        </View>
      ) : null}

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.top} onLayout={handleTopBlockLayout}>
          <BrandLogo size={isCompact ? 34 : 40} />
          <View style={styles.tag}>
            <View style={styles.tagDot} />
            <Text style={styles.tagText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              DEVOCIONAL DIÁRIO & APRENDIZADO
            </Text>
          </View>
        </View>

        {/* Flexible space where the illustration shows through. */}
        <View style={styles.heroSpace} />

        <View style={[styles.content, isCompact && styles.contentCompact]} onLayout={handleContentLayout}>
          <View style={styles.highlight}>
            <Text style={styles.highlightText} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Top <Text style={styles.highlightRank}>#1</Text>{' '}
              <Text style={styles.highlightStrong}>App para Conhecimento Bíblico</Text>
            </Text>
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <View style={styles.statRow}>
                <Text style={styles.statValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  4,8
                </Text>
                <MaterialCommunityIcons name="star" size={16} color={colors.primary} />
              </View>
              <Text style={styles.statLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Avaliação
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                +10 mi
              </Text>
              <Text style={styles.statLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Cristãos
              </Text>
            </View>
          </View>

          <Text
            style={[styles.title, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.18) }]}
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          >
            Bem-vindo ao BibleWise!
          </Text>
          <Text
            style={[styles.subtitle, { fontSize: subtitleSize, lineHeight: Math.round(subtitleSize * 1.45) }]}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          >
            Conecte-se com Deus, memorize escrituras sagradas e renove sua fé onde quer que você esteja.
          </Text>

          <View style={styles.benefits}>
            {BENEFITS.map((benefit) => (
              <View key={benefit.title} style={[styles.benefit, isCompact && styles.benefitCompact]}>
                <View style={[styles.benefitIcon, { backgroundColor: benefit.background }]}>
                  <MaterialCommunityIcons name={benefit.icon} size={18} color={benefit.tint} />
                </View>
                <Text style={styles.benefitTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {benefit.title}
                </Text>
                <Text
                  style={styles.benefitDescription}
                  numberOfLines={2}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                >
                  {benefit.description}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <PrimaryButton label="Continuar" onPress={() => router.push('/age')} />
            <PrivacyNote
              icon="check-circle"
              text="Ao continuar você concorda com nossas Políticas de Privacidade e Termos de Uso."
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
  },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  top: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    ...shadow,
  },
  tagDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8BD346',
  },
  tagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.onSurface,
  },
  heroSpace: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  contentCompact: {
    gap: spacing.sm,
  },
  highlight: {
    alignSelf: 'center',
    maxWidth: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  highlightText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  highlightRank: {
    fontFamily: fonts.bodyBold,
    color: colors.primary,
  },
  highlightStrong: {
    fontFamily: fonts.bodySemiBold,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxxl,
  },
  stat: {
    alignItems: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: colors.onSurface,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  statDivider: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F5CFC8',
  },
  title: {
    fontFamily: fonts.titleBold,
    color: colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  benefits: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  benefit: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  benefitCompact: {
    paddingVertical: spacing.md,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  benefitTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  benefitDescription: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  footer: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});
