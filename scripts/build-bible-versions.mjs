/**
 * Converts the per-book Bible sources in
 *   assets/bible-versions/bible versions multiple languages/<Language>/<Version>/
 * into one compact file per version: assets/bible-data/<code>.bible
 * (JSON `RawBook[]` = `{ abbrev, name, chapters: string[][] }`, the same shape as TB.json).
 *
 * Run (Node >= 22): node scripts/build-bible-versions.mjs
 *
 * Rules:
 *  - footnotes, headings and superscriptions are dropped; text is trimmed;
 *  - index + 1 is the real verse number, so gaps in the source numbering (Psalm titles in the
 *    Russian Synodal, Douay, YLT...) are padded with "" — the loader skips empty verses;
 *  - the Norwegian source has English book names, replaced by Norwegian ones;
 *  - any anomaly (wrong book count, empty chapter, duplicate verse number) aborts the run.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = fileURLToPath(new URL('../assets/bible-versions/bible versions multiple languages/', import.meta.url));
const OUTPUT = fileURLToPath(new URL('../assets/bible-data/', import.meta.url));

/** [source folder, version code, expected book count] */
const VERSIONS = [
  ['Arabic/Smith-Van-Dyck-1865', 'SVD-AR', 66],
  ['English/American-Standard-Version', 'ASV-EN', 66],
  ['English/Darby-Bible', 'DBY-EN', 66],
  ['English/Douay-Rheims-Challoner', 'DRC-EN', 73],
  ['English/JPS-1917', 'JPS-EN', 39],
  ['English/King-James-Version', 'KJV-EN', 66],
  ['English/World-English-Bible', 'WEB-EN', 66],
  ['English/Youngs-Literal-Translation', 'YLT-EN', 66],
  ['French/Darby-Bible', 'JND-FR', 66],
  ['French/Louis-Segond-1910', 'LSG-FR', 66],
  ['German/Luther-1912', 'LUT-DE', 66],
  ['Italian/Diodati-1649', 'DIO-IT', 66],
  ['Italian/Riveduta-1927', 'RIV-IT', 66],
  ['Norwegian/Bibelen-1930', 'NO1930-NO', 66],
  ['Portuguese/Almeida-Portuguese', 'JFA-PT', 66],
  ['Russian/Russian-Synodal', 'RST-RU', 66],
  ['Spanish/Reina-Valera-1909', 'RV1909-ES', 66],
];

const NORWEGIAN_NAMES = [
  '1 Mosebok', '2 Mosebok', '3 Mosebok', '4 Mosebok', '5 Mosebok', 'Josva', 'Dommerne', 'Rut', '1 Samuelsbok',
  '2 Samuelsbok', '1 Kongebok', '2 Kongebok', '1 Krønikebok', '2 Krønikebok', 'Esra', 'Nehemja', 'Ester', 'Job',
  'Salmenes bok', 'Ordspråkene', 'Forkynneren', 'Høysangen', 'Esaias', 'Jeremias', 'Klagesangene', 'Esekiel',
  'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadja', 'Jona', 'Mika', 'Nahum', 'Habakkuk', 'Sefanja', 'Haggai', 'Sakarja',
  'Malaki', 'Matteus', 'Markus', 'Lukas', 'Johannes', 'Apostlenes gjerninger', 'Romerne', '1 Korinterne',
  '2 Korinterne', 'Galaterne', 'Efeserne', 'Filipperne', 'Kolosserne', '1 Tessalonikerne', '2 Tessalonikerne',
  '1 Timoteus', '2 Timoteus', 'Titus', 'Filemon', 'Hebreerne', 'Jakob', '1 Peter', '2 Peter', '1 Johannes',
  '2 Johannes', '3 Johannes', 'Judas', 'Johannes’ Åpenbaring',
];

const fail = (message) => {
  console.error(`ERROR: ${message}`);
  process.exit(1);
};

mkdirSync(OUTPUT, { recursive: true });
const rows = [];

for (const [folder, code, expectedBooks] of VERSIONS) {
  const dir = join(SOURCE, folder);
  const files = readdirSync(dir).filter((file) => /^\d\d-.*\.json$/.test(file)).sort();
  if (files.length !== expectedBooks) fail(`${code}: expected ${expectedBooks} books, found ${files.length}`);

  const books = [];
  let verses = 0, padded = 0, empty = 0, chapters = 0;
  const repaired = [];
  for (const file of files) {
    const source = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    if (source.number !== books.length + 1) fail(`${code}: ${file} has book number ${source.number}, expected ${books.length + 1}`);

    const bookChapters = source.chapters.map((chapter, chapterIndex) => {
      if (chapter.chapter !== chapterIndex + 1) fail(`${code}: ${source.book} chapter ${chapter.chapter} out of order`);
      const list = [];
      const numbers = chapter.verses.map((verse) => verse.verse);
      const increasing = numbers.every((number, i) => Number.isInteger(number) && number >= 1 && (i === 0 || number > numbers[i - 1]));
      // Source typos (Douay "4, 6, 6", "11, 11"...): when the numbers are not strictly increasing but the
      // last number equals the verse count, the position in the list is the real verse number.
      const positional = !increasing && numbers[numbers.length - 1] === numbers.length;
      if (!increasing && !positional) fail(`${code}: ${source.book} ${chapter.chapter} has unusable verse numbers: ${numbers.join(',')}`);
      if (positional) repaired.push(`${source.book} ${chapter.chapter}`);
      chapter.verses.forEach((verse, position) => {
        const index = positional ? position : verse.verse - 1;
        list[index] = String(verse.text ?? '').replace(/\s+/g, ' ').trim();
      });
      for (let i = 0; i < list.length; i += 1) {
        if (list[i] === undefined) { list[i] = ''; padded += 1; }
        else if (list[i] === '') empty += 1;
        else verses += 1;
      }
      if (!list.some((text) => text !== '')) fail(`${code}: ${source.book} ${chapter.chapter} has no text`);
      chapters += 1;
      return list;
    });

    const name = code === 'NO1930-NO' && books.length < 66 ? NORWEGIAN_NAMES[books.length] : source.book;
    books.push({ abbrev: source.abbreviation, name, chapters: bookChapters });
  }

  const outFile = join(OUTPUT, `${code.toLowerCase()}.bible`);
  writeFileSync(outFile, JSON.stringify(books));
  const mb = (statSync(outFile).size / 1048576).toFixed(2);
  rows.push({ code, books: books.length, chapters, verses, padded, empty, repaired: repaired.length, MB: mb, first: books[0].name, last: books[books.length - 1].name });
  if (repaired.length) console.log(`  ${code} repaired duplicate numbers: ${repaired.join(', ')}`);
}

console.table(rows);
console.log(`Wrote ${rows.length} files to assets/bible-data/`);
