/** Shortcuts shown under the search bar, as positions (0-based book id as in the Bible data). */
export const QUICK_REFERENCES: readonly { bookId: number; chapter: number; verse?: number }[] = [
  { bookId: 0, chapter: 1 }, // Genesis 1
  { bookId: 18, chapter: 23 }, // Psalms 23
  { bookId: 42, chapter: 3, verse: 16 }, // John 3:16
  { bookId: 44, chapter: 8 }, // Romans 8
];
