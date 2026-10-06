import type { BibleVersionMeta } from '../types/bible';

/** Raw shape of the bundled JSON files. */
export type RawBook = { abbrev: string; name: string; chapters: string[][] };

export interface BibleVersionEntry extends BibleVersionMeta {
  /**
   * Lazy loader. Metro needs literal `require()` paths to bundle the files, and
   * wrapping them in a function avoids parsing ~4 MB per version at app start.
   * To add a language/version: drop the JSON in `assets/bible-versions/` and add one entry.
   */
  load: () => RawBook[];
}

export const BIBLE_VERSION_REGISTRY: readonly BibleVersionEntry[] = [
  {
    code: 'TB-PT',
    label: 'TB-PT',
    name: 'Tradução Brasileira',
    language: 'pt-BR',
    load: () => require('../assets/bible-versions/TB.json') as RawBook[],
  },
  {
    code: 'BLIVRE-PT',
    label: 'BLIVRE-PT',
    name: 'Bíblia Livre',
    language: 'pt-BR',
    load: () => require('../assets/bible-versions/BLIVRE.json') as RawBook[],
  },
];
