import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { colors, fonts, radius, spacing } from '../theme/tokens';
import type { Book, ReadingPosition } from '../types/bible';

interface Props {
  visible: boolean;
  books: Book[];
  position: ReadingPosition;
  onSelect: (position: ReadingPosition) => void;
  onClose: () => void;
}

/** Step 1: book list grouped by testament. Step 2: chapter grid. */
export function BookPickerSheet({ visible, books, position, onSelect, onClose }: Props) {
  const [pickedBook, setPickedBook] = useState<Book | null>(null);

  // Always reopen on the book list.
  const close = () => {
    setPickedBook(null);
    onClose();
  };

  const renderBook = (book: Book) => (
    <Pressable
      key={book.id}
      onPress={() => setPickedBook(book)}
      accessibilityRole="button"
      style={[styles.bookRow, book.id === position.bookId && styles.bookRowActive]}
    >
      <Text style={styles.bookNumber}>{book.id + 1}</Text>
      <Text style={styles.bookName}>{book.name}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.outline} />
    </Pressable>
  );

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.header}>
        {pickedBook ? (
          <Pressable onPress={() => setPickedBook(null)} accessibilityRole="button" accessibilityLabel="Voltar para os livros" hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.onSurface} />
          </Pressable>
        ) : null}
        <Text style={styles.title}>{pickedBook ? pickedBook.name : 'Livros'}</Text>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8} style={styles.close}>
          <MaterialCommunityIcons name="close" size={22} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>

      {pickedBook ? (
        <ScrollView contentContainerStyle={styles.grid}>
          {pickedBook.chapters.map((chapter) => {
            const active = pickedBook.id === position.bookId && chapter.number === position.chapter;
            return (
              <Pressable
                key={chapter.number}
                onPress={() => {
                  onSelect({ bookId: pickedBook.id, chapter: chapter.number });
                  close();
                }}
                accessibilityRole="button"
                accessibilityLabel={`${pickedBook.name} capítulo ${chapter.number}`}
                style={[styles.cell, active && styles.cellActive]}
              >
                <Text style={[styles.cellText, active && styles.cellTextActive]}>{chapter.number}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.section}>ANTIGO TESTAMENTO</Text>
          {books.filter((book) => book.testament === 'AT').map(renderBook)}
          <Text style={styles.section}>NOVO TESTAMENTO</Text>
          {books.filter((book) => book.testament === 'NT').map(renderBook)}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { flex: 1, fontFamily: fonts.titleSemiBold, fontSize: 22, color: colors.onSurface },
  close: { marginLeft: 'auto' },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: 6 },
  section: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 1, color: colors.onSurfaceVariant, marginTop: spacing.md, marginBottom: 4 },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
  },
  bookRowActive: { backgroundColor: colors.selectedContainer },
  bookNumber: { width: 26, fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.outline },
  bookName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.onSurface },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  cell: {
    width: 56,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { backgroundColor: colors.primary },
  cellText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.onSurface },
  cellTextActive: { color: colors.onPrimary },
});
