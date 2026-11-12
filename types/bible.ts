export type Testament = 'AT' | 'NT';

/** Static description of a Bible version (the JSON files carry no metadata). */
export interface BibleVersionMeta {
  /** Unique code, e.g. "TB-PT". Persisted as the selected version. */
  code: string;
  /** Short label shown in the pill. */
  label: string;
  /** Full name shown in the picker. */
  name: string;
  /** BCP-47 language tag, e.g. "pt-BR". */
  language: string;
  /** Year of the translation, shown in the picker. */
  year?: number;
  /** Text direction; defaults to left-to-right. */
  direction?: 'rtl';
  /** `ot` = Old Testament only (no New Testament books). */
  scope?: 'ot';
  /** `vulgate` = Psalms use the Vulgate/Septuagint numbering (differs from most Bibles). */
  numbering?: 'vulgate';
  /** True when the version also contains deuterocanonical books (listed after the Old Testament). */
  deuterocanon?: boolean;
}

export interface Verse {
  number: number;
  text: string;
}

export interface Chapter {
  number: number;
  verses: Verse[];
  /** Optional chapter subtitle; none of the current JSON files provide it. */
  subtitle?: string;
}

export interface Book {
  /** 0-based canonical index (0 = Gênesis ... 65 = Apocalipse). */
  id: number;
  name: string;
  abbrev: string;
  testament: Testament;
  chapters: Chapter[];
}

export interface BibleVersion extends BibleVersionMeta {
  books: Book[];
}

export interface BibleTheme {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  /** Three palette dots shown in the picker. */
  colors: [string, string, string];
  background: string;
  text: string;
  verseHighlight: string;
  accent: string;
  cardBackground: string;
  /** Icon used in the picker row. */
  icon: string;
  iconBackground: string;
}

export interface ReadingPosition {
  bookId: number;
  chapter: number;
}

export interface ParsedReference extends ReadingPosition {
  verse?: number;
  /** The book is a real book, but the selected version does not contain it. */
  bookMissing?: boolean;
}
