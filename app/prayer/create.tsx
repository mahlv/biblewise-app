import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from 'convex/react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../convex/_generated/api';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ProfileTextField } from '../../components/ProfileTextField';
import { useBible } from '../../hooks/useBible';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useToast } from '../../hooks/useToast';
import { haptics } from '../../lib/haptics';
import { serverErrorMessage as errorMessage } from '../../lib/serverError';
import { loadVersion, parseReference } from '../../lib/bibleLoader';
import { splitReference } from '../../lib/bibleReference';
import {
  PRAYER_CATEGORIES,
  PRAYER_CATEGORY_COLORS,
  PRAYER_LIMITS,
  type PrayerCategory,
  type PrayerType,
} from '../../lib/prayerCategories';
import { categoryLabel, anonymousName } from '../../lib/prayerLabels';
import { colors, fonts, radius, spacing } from '../../theme/tokens';
import { AppPressable } from '../../components/ui/AppPressable';

const TYPE_OPTIONS: { id: PrayerType; labelKey: 'prayer.types.requestLong' | 'prayer.types.testimony'; icon: 'hands-pray' | 'star-four-points' }[] = [
  { id: 'request', labelKey: 'prayer.types.requestLong', icon: 'hands-pray' },
  { id: 'testimony', labelKey: 'prayer.types.testimony', icon: 'star-four-points' },
];

/** Form to publish a prayer request or a testimony on the wall. */
export default function CreatePrayerScreen() {
  const { anonymousId } = useOnboarding();
  const { versionCode } = useBible();
  const toast = useToast();
  const { t } = useTranslation();
  const user = useQuery(api.users.getUserByAnonymousId, anonymousId ? { anonymousId } : 'skip');
  const createPrayer = useMutation(api.prayers.createPrayer);

  const [type, setType] = useState<PrayerType>('request');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PrayerCategory | null>(null);
  const [content, setContent] = useState('');
  const [reference, setReference] = useState('');
  const [verseText, setVerseText] = useState('');
  const [anonymousChoice, setAnonymousChoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; category?: string; content?: string }>({});

  const hasName = !!user?.name?.trim();
  // Without a profile name the post is always anonymous (the server enforces it too).
  const anonymous = anonymousChoice || !hasName;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/diary'));

  // Examples use book names of the open Bible version, which is what the reference parser understands best.
  const sampleBook = (id: number) => loadVersion(versionCode).books[id]?.name ?? loadVersion(versionCode).books[0]?.name ?? '';
  const examplePsalm = `${sampleBook(18)} 23:1-2`;
  const exampleJohn = `${sampleBook(42)} 3:16`;

  /** Fills the verse text from the Bible version the user reads, using the typed reference. */
  const fillVerse = () => {
    const split = splitReference(reference);
    const parsed = parseReference(reference, versionCode);
    if (!split || !parsed || parsed.bookMissing || split.versiculoInicial === undefined) {
      Alert.alert(t('prayer.create.verseNotFound'), t('prayer.create.verseNeedsVerse', { first: exampleJohn, second: examplePsalm }));
      return;
    }
    const version = loadVersion(versionCode);
    const book = version.books[parsed.bookId];
    const chapter = book?.chapters[parsed.chapter - 1];
    if (!book || !chapter) return;

    const from = split.versiculoInicial;
    const to = split.versiculoFinal ?? from;
    const verses = chapter.verses.filter((verse) => verse.number >= from && verse.number <= to);
    if (verses.length === 0) {
      Alert.alert(t('prayer.create.verseNotFound'), t('prayer.create.verseNotInVersion'));
      return;
    }
    setReference(`${book.name} ${parsed.chapter}:${from}${to > from ? `-${to}` : ''}`);
    setVerseText(verses.map((verse) => verse.text).join(' ').slice(0, PRAYER_LIMITS.scriptureText));
  };

  const handleSubmit = async () => {
    if (!anonymousId || submitting) return;
    const next: typeof errors = {};
    if (!title.trim()) next.title = t('prayer.create.titleRequired');
    if (!category) next.category = t('prayer.create.categoryRequired');
    if (!content.trim()) next.content = t('prayer.create.contentRequired');
    setErrors(next);
    if (next.title || next.category || next.content || !category) return;

    setSubmitting(true);
    try {
      await createPrayer({
        anonymousId,
        type,
        category,
        title,
        content,
        scriptureReference: reference.trim() || undefined,
        scriptureText: verseText.trim() || undefined,
        isAnonymous: anonymous,
      });
      haptics.success();
      toast(t('prayer.create.published'));
      goBack();
    } catch (error) {
      haptics.error();
      Alert.alert(t('prayer.create.publishFailed'), errorMessage(error, t('prayer.create.tryLater')));
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <AppPressable onPress={goBack} accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.headerButton}>
          <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
        </AppPressable>
        <Text style={styles.headerTitle}>{t('prayer.create.headerTitle')}</Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((option) => {
              const selected = option.id === type;
              return (
                <AppPressable haptic="selection"
                  key={option.id}
                  onPress={() => setType(option.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.typeOption, selected && styles.typeOptionSelected]}
                >
                  <MaterialCommunityIcons name={option.icon} size={18} color={selected ? colors.onPrimary : colors.outline} />
                  <Text style={[styles.typeText, selected && styles.typeTextSelected]}>{t(option.labelKey)}</Text>
                </AppPressable>
              );
            })}
          </View>

          <ProfileTextField
            label={t('prayer.create.title')}
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              if (errors.title) setErrors({ ...errors, title: undefined });
            }}
            placeholder={type === 'request' ? t('prayer.create.titlePlaceholderRequest') : t('prayer.create.titlePlaceholderTestimony')}
            maxLength={PRAYER_LIMITS.title}
            error={errors.title}
          />

          <View style={styles.group}>
            <Text style={styles.label}>{t('prayer.create.category')}</Text>
            <View style={styles.chips}>
              {PRAYER_CATEGORIES.map((item) => {
                const selected = item === category;
                const tone = PRAYER_CATEGORY_COLORS[item];
                return (
                  <AppPressable haptic="selection"
                    key={item}
                    onPress={() => {
                      setCategory(item);
                      if (errors.category) setErrors({ ...errors, category: undefined });
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.chip, { backgroundColor: tone.background }, selected && { borderColor: tone.text }]}
                  >
                    <Text style={[styles.chipText, { color: tone.text }]}>{categoryLabel(item)}</Text>
                  </AppPressable>
                );
              })}
            </View>
            {errors.category ? <Text style={styles.error}>{errors.category}</Text> : null}
          </View>

          <View style={styles.group}>
            <Text style={styles.label}>{t('prayer.create.message')}</Text>
            <TextInput
              value={content}
              onChangeText={(value) => {
                setContent(value);
                if (errors.content) setErrors({ ...errors, content: undefined });
              }}
              placeholder={type === 'request' ? t('prayer.create.messagePlaceholderRequest') : t('prayer.create.messagePlaceholderTestimony')}
              placeholderTextColor={colors.outline}
              multiline
              maxLength={PRAYER_LIMITS.content}
              textAlignVertical="top"
              accessibilityLabel={t('prayer.create.message')}
              style={[styles.input, styles.multiline, errors.content ? styles.inputError : null]}
            />
            <View style={styles.counterRow}>
              {errors.content ? <Text style={styles.error}>{errors.content}</Text> : <View />}
              <Text style={styles.counter}>
                {content.length}/{PRAYER_LIMITS.content}
              </Text>
            </View>
          </View>

          <View style={styles.group}>
            <Text style={styles.label}>{t('prayer.create.verseOptional')}</Text>
            <ProfileTextField
              label={t('prayer.create.reference')}
              value={reference}
              onChangeText={setReference}
              placeholder={t('prayer.create.referencePlaceholder', { example: examplePsalm })}
              maxLength={PRAYER_LIMITS.scriptureReference}
            />
            <AppPressable onPress={fillVerse} accessibilityRole="button" style={({ pressed }) => [styles.verseButton, pressed && { opacity: 0.85 }]}>
              <MaterialCommunityIcons name="book-search-outline" size={18} color={colors.primary} />
              <Text style={styles.verseButtonText}>{t('prayer.create.fillVerse')}</Text>
            </AppPressable>
            <TextInput
              value={verseText}
              onChangeText={setVerseText}
              placeholder={t('prayer.create.verseTextPlaceholder')}
              placeholderTextColor={colors.outline}
              multiline
              maxLength={PRAYER_LIMITS.scriptureText}
              textAlignVertical="top"
              accessibilityLabel={t('prayer.create.verseTextPlaceholder')}
              style={[styles.input, styles.verseInput]}
            />
          </View>

          <View style={styles.anonymousRow}>
            <View style={styles.anonymousTexts}>
              <Text style={styles.anonymousTitle}>{t('prayer.create.anonymousTitle')}</Text>
              <Text style={styles.anonymousBody}>
                {hasName ? t('prayer.create.anonymousBody', { name: anonymousName() }) : t('prayer.create.noName')}
              </Text>
            </View>
            <Switch
              value={anonymous}
              disabled={!hasName}
              onValueChange={(value) => {
                haptics.selection();
                setAnonymousChoice(value);
              }}
              trackColor={{ false: colors.outlineVariant, true: colors.primary }}
              thumbColor={colors.onPrimary}
              accessibilityLabel={t('prayer.create.anonymousTitle')}
            />
          </View>

          {!hasName ? (
            <AppPressable onPress={() => router.push('/profile/edit')} accessibilityRole="link">
              <Text style={styles.link}>{t('prayer.create.editProfile')}</Text>
            </AppPressable>
          ) : null}
          <Text style={styles.rules}>
            {t('prayer.create.rules')}
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton label={type === 'request' ? t('prayer.create.publishRequest') : t('prayer.create.publishTestimony')} showArrow={false} onPress={handleSubmit} loading={submitting} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.titleSemiBold, fontSize: 22, color: colors.onSurface },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.xl },
  typeRow: { flexDirection: 'row', gap: spacing.xs, backgroundColor: colors.surfaceContainer, borderRadius: radius.pill, padding: 4 },
  typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 48, borderRadius: radius.pill },
  typeOptionSelected: { backgroundColor: colors.primary },
  typeText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.outline },
  typeTextSelected: { color: colors.onPrimary },
  group: { gap: spacing.sm },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.onSurfaceVariant },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderRadius: radius.pill, borderWidth: 1.5, borderColor: 'transparent', paddingHorizontal: spacing.md, paddingVertical: 8 },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.4 },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
  },
  multiline: { minHeight: 150, paddingBottom: spacing.md },
  verseInput: { minHeight: 90, paddingBottom: spacing.md, fontFamily: fonts.verseItalic, fontSize: 16 },
  inputError: { borderColor: colors.primary },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  counter: { fontFamily: fonts.body, fontSize: 12, color: colors.outline },
  error: { fontFamily: fonts.body, fontSize: 12, color: colors.primary },
  verseButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, height: 44, borderRadius: radius.pill, backgroundColor: colors.surfaceContainer },
  verseButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primary },
  anonymousRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, padding: spacing.lg },
  anonymousTexts: { flex: 1, gap: 2 },
  anonymousTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onSurface },
  anonymousBody: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.onSurfaceVariant },
  link: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primary, textAlign: 'center' },
  rules: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.outline, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
});
