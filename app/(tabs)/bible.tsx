import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { requireOptionalNativeModule } from 'expo';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BibleSearchBar } from '../../components/BibleSearchBar';
import { BibleTopBar } from '../../components/BibleTopBar';
import { BookPickerSheet } from '../../components/BookPickerSheet';
import { ChapterNavigation } from '../../components/ChapterNavigation';
import { QuickReferenceChips } from '../../components/QuickReferenceChips';
import { ThemePickerSheet } from '../../components/ThemePickerSheet';
import { VerseList } from '../../components/VerseList';
import { VerseSelectionToolbar } from '../../components/VerseSelectionToolbar';
import { VersionPickerSheet } from '../../components/VersionPickerSheet';
import { useBible } from '../../hooks/useBible';
import { readHighlights, saveHighlights, type VerseHighlights } from '../../lib/biblePreferences';
import { useToast } from '../../hooks/useToast';
import { clampPosition, getAdjacentChapter, loadVersion, parseReference } from '../../lib/bibleLoader';
import { colors, fonts, radius, spacing } from '../../theme/tokens';
import type { ReadingPosition } from '../../types/bible';

type Sheet = 'version' | 'book' | 'theme' | null;

/** Bible reading tab. */
export default function BibleScreen() {
  const { ready, versions, versionCode, theme, position, setVersionCode, setThemeId, setPosition } = useBible();
  const toast = useToast();

  const [sheet, setSheet] = useState<Sheet>(null);
  const [query, setQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

  const [highlights, setHighlights] = useState<VerseHighlights>({});

  useEffect(() => {
    readHighlights().then(setHighlights);
  }, []);

  const scrollRef = useRef<ScrollView>(null);
  const verseOffsets = useRef(new Map<number, number>());
  const cardY = useRef(0);
  const [pendingScrollVerse, setPendingScrollVerse] = useState<number | null>(null);

  const version = useMemo(() => loadVersion(versionCode), [versionCode]);
  const safePosition = useMemo(() => clampPosition(version.code, position), [version.code, position]);
  const book = version.books[safePosition.bookId];
  const chapter = book?.chapters[safePosition.chapter - 1];

  const previous = getAdjacentChapter(version.code, safePosition, 'previous');
  const next = getAdjacentChapter(version.code, safePosition, 'next');
  const nextBook = next ? version.books[next.bookId] : undefined;

  const goTo = useCallback(
    (target: ReadingPosition, verse?: number) => {
      verseOffsets.current.clear();
      setPosition(target);
      setSelectedVerse(verse ?? null);
      setPendingScrollVerse(verse ?? null);
      if (!verse) scrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [setPosition],
  );

  // Scroll to a searched verse once its layout is known.
  useEffect(() => {
    if (pendingScrollVerse === null) return;
    const timer = setTimeout(() => {
      const y = verseOffsets.current.get(pendingScrollVerse);
      if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(cardY.current + y - 120, 0), animated: true });
      setPendingScrollVerse(null);
    }, 150);
    return () => clearTimeout(timer);
  }, [pendingScrollVerse, safePosition]);

  const search = (text: string) => {
    const parsed = parseReference(text, version.code);
    if (!parsed) {
      setSearchError('Não encontrei essa passagem. Tente "João 3:16" ou "Gênesis 1".');
      return;
    }
    setSearchError(null);
    setQuery('');
    goTo({ bookId: parsed.bookId, chapter: parsed.chapter }, parsed.verse);
  };

  const verseText = (): string | null => {
    const verse = chapter?.verses.find((item) => item.number === selectedVerse);
    if (!verse || !book) return null;
    return `"${verse.text}"\n${book.name} ${safePosition.chapter}:${verse.number} (${version.label})`;
  };

  const handleCopy = async () => {
    const text = verseText();
    if (!text) return;
    // Builds made before expo-clipboard was added lack the native module.
    if (!requireOptionalNativeModule('ExpoClipboard')) {
      toast('Copiar exige o app atualizado (nova build)');
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
      await Clipboard.setStringAsync(text);
      toast('Versículo copiado');
    } catch {
      toast('Não foi possível copiar agora');
    }
  };

  const chapterKey = `${safePosition.bookId}:${safePosition.chapter}`;
  const highlightedVerses = highlights[chapterKey] ?? [];

  const handleHighlight = () => {
    if (selectedVerse === null) return;
    const already = highlightedVerses.includes(selectedVerse);
    const updated = already ? highlightedVerses.filter((verse) => verse !== selectedVerse) : [...highlightedVerses, selectedVerse];
    const next = { ...highlights, [chapterKey]: updated };
    if (updated.length === 0) delete next[chapterKey];
    setHighlights(next);
    void saveHighlights(next);
    toast(already ? 'Destaque removido' : 'Versículo destacado');
  };

  const handleShare = async () => {
    const text = verseText();
    if (text) await Share.share({ message: text }).catch(() => undefined);
  };

  if (!ready || !book || !chapter) return <View style={[styles.screen, { backgroundColor: theme.background }]} />;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.fixed}>
        <BibleTopBar
          versionLabel={version.label}
          bookLabel={`${book.id + 1} - ${book.name}`}
          onPressVersion={() => setSheet('version')}
          onPressBook={() => setSheet('book')}
          onPressNotifications={() => toast('Disponível em breve')}
          onPressTheme={() => setSheet('theme')}
        />
        <BibleSearchBar
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setSearchError(null);
          }}
          onSubmit={() => search(query)}
          onPressMic={() => toast('Busca por voz em breve')}
        />
        {searchError ? <Text style={styles.error}>{searchError}</Text> : null}
        <QuickReferenceChips onSelect={search} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View
          style={[styles.card, { backgroundColor: theme.cardBackground }]}
          onLayout={(event) => {
            cardY.current = event.nativeEvent.layout.y;
          }}
        >
          <Text style={[styles.testament, { color: theme.text }]}>
            {book.testament === 'AT' ? 'ANTIGO TESTAMENTO' : 'NOVO TESTAMENTO'}
          </Text>
          <Text style={[styles.title, { color: theme.accent }]} accessibilityRole="header">
            {book.name} {safePosition.chapter}
          </Text>
          {chapter.subtitle ? <Text style={[styles.subtitle, { color: theme.text }]}>{chapter.subtitle}</Text> : null}

          {selectedVerse !== null ? (
            <View style={styles.toolbar}>
              <VerseSelectionToolbar
                verse={selectedVerse}
                onCopy={handleCopy}
                onHighlight={handleHighlight}
                onNote={() => toast('Notas em breve')}
                onShare={handleShare}
              />
            </View>
          ) : null}

          <VerseList
            verses={chapter.verses}
            theme={theme}
            selectedVerse={selectedVerse}
            highlightedVerses={highlightedVerses}
            onToggleVerse={(verse) => setSelectedVerse((current) => (current === verse ? null : verse))}
            onVerseLayout={(verse, y) => verseOffsets.current.set(verse, y)}
          />

          <ChapterNavigation
            accent={theme.accent}
            previousLabel={previous ? (previous.bookId === book.id ? 'Capítulo anterior' : 'Livro anterior') : null}
            nextLabel={next && nextBook ? `${nextBook.name} ${next.chapter}` : null}
            onPrevious={() => previous && goTo(previous)}
            onNext={() => next && goTo(next)}
          />
        </View>
      </ScrollView>

      <VersionPickerSheet
        visible={sheet === 'version'}
        versions={versions}
        selectedCode={version.code}
        onSelect={setVersionCode}
        onClose={() => setSheet(null)}
      />
      <BookPickerSheet
        visible={sheet === 'book'}
        books={version.books}
        position={safePosition}
        onSelect={(target) => goTo(target)}
        onClose={() => setSheet(null)}
      />
      <ThemePickerSheet visible={sheet === 'theme'} appliedThemeId={theme.id} onApply={setThemeId} onClose={() => setSheet(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fixed: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm, gap: spacing.md },
  error: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary },
  // Extra bottom padding keeps the last line clear of the tab bar and the mic button.
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 140 },
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  testament: { textAlign: 'center', fontFamily: fonts.bodyMedium, fontSize: 11, letterSpacing: 2, opacity: 0.7 },
  title: { textAlign: 'center', fontFamily: fonts.titleSemiBold, fontSize: 34, marginTop: 4 },
  subtitle: { textAlign: 'center', fontFamily: fonts.verseItalic, fontSize: 15, marginTop: 2, opacity: 0.8 },
  toolbar: { marginVertical: spacing.md },
});
