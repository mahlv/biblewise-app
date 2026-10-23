/**
 * Curated passages for the Home "Frase do Dia". Positions are version-independent
 * (0-based `bookId` as in the Bible JSON files, verses inclusive), so the text
 * comes from whichever version the user reads.
 */
export interface DailyVerseRef {
  bookId: number;
  chapter: number;
  from: number;
  to: number;
}

const ref = (bookId: number, chapter: number, from: number, to: number = from): DailyVerseRef => ({
  bookId,
  chapter,
  from,
  to,
});

export const DAILY_VERSES: readonly DailyVerseRef[] = [
  ref(18, 23, 1, 2), // Salmos 23:1-2
  ref(42, 3, 16), // João 3:16
  ref(49, 4, 13), // Filipenses 4:13
  ref(23, 29, 11), // Jeremias 29:11
  ref(22, 41, 10), // Isaías 41:10
  ref(19, 3, 5, 6), // Provérbios 3:5-6
  ref(44, 8, 28), // Romanos 8:28
  ref(5, 1, 9), // Josué 1:9
  ref(39, 11, 28), // Mateus 11:28
  ref(18, 46, 1), // Salmos 46:1
  ref(18, 91, 1, 2), // Salmos 91:1-2
  ref(18, 121, 1, 2), // Salmos 121:1-2
  ref(22, 40, 31), // Isaías 40:31
  ref(24, 3, 22, 23), // Lamentações 3:22-23
  ref(39, 6, 33), // Mateus 6:33
  ref(44, 12, 2), // Romanos 12:2
  ref(47, 2, 20), // Gálatas 2:20
  ref(48, 2, 8, 9), // Efésios 2:8-9
  ref(49, 4, 6, 7), // Filipenses 4:6-7
  ref(50, 3, 23), // Colossenses 3:23
  ref(59, 5, 7), // 1 Pedro 5:7
  ref(57, 11, 1), // Hebreus 11:1
  ref(58, 1, 5), // Tiago 1:5
  ref(61, 4, 19), // 1 João 4:19
  ref(18, 27, 1), // Salmos 27:1
  ref(18, 37, 4, 5), // Salmos 37:4-5
  ref(18, 119, 105), // Salmos 119:105
  ref(19, 16, 3), // Provérbios 16:3
  ref(20, 3, 1), // Eclesiastes 3:1
  ref(32, 6, 8), // Miquéias 6:8
  ref(42, 14, 27), // João 14:27
  ref(42, 8, 12), // João 8:12
  ref(39, 5, 14, 16), // Mateus 5:14-16
  ref(39, 28, 19, 20), // Mateus 28:19-20
  ref(54, 1, 7), // 2 Timóteo 1:7
  ref(44, 5, 8), // Romanos 5:8
  ref(35, 3, 17), // Sofonias 3:17
  ref(18, 34, 8), // Salmos 34:8
  ref(4, 31, 6), // Deuteronômio 31:6
  ref(45, 13, 4, 7), // 1 Coríntios 13:4-7
  ref(49, 1, 6), // Filipenses 1:6
  ref(65, 21, 4), // Apocalipse 21:4
];
