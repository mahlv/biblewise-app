/**
 * Validates assets/widget/quotes.json (the single source for both native widgets).
 * Run with: node --no-warnings --experimental-strip-types scripts/check-widget-quotes.ts
 *
 * Size limits keep the text readable on the smallest (2x2) widget without truncation:
 * the text is at most 110 characters and the author/reference line at most 28.
 */
import { readFileSync } from 'node:fs';

const MIN_QUOTES = 730;
const MAX_TEXT_LENGTH = 110;
const MAX_AUTHOR_LENGTH = 28;

const quotes = JSON.parse(readFileSync(new URL('../assets/widget/quotes.json', import.meta.url), 'utf8')) as unknown;
const errors: string[] = [];

if (!Array.isArray(quotes)) {
  console.error('quotes.json must be an array.');
  process.exit(1);
}
if (quotes.length < MIN_QUOTES) errors.push(`Expected at least ${MIN_QUOTES} entries, found ${quotes.length}.`);

const ids = new Set<string>();
const texts = new Set<string>();
const perType: Record<string, number> = {};
for (const [index, quote] of quotes.entries()) {
  const label = `#${index + 1}`;
  if (typeof quote?.id !== 'string' || !quote.id) errors.push(`${label}: missing id.`);
  else if (ids.has(quote.id)) errors.push(`${label}: duplicate id ${quote.id}.`);
  else ids.add(quote.id);

  if (typeof quote?.text !== 'string' || !quote.text.trim()) errors.push(`${label}: empty text.`);
  else {
    if (quote.text.length > MAX_TEXT_LENGTH) errors.push(`${label}: text longer than ${MAX_TEXT_LENGTH} chars (${quote.text.length}).`);
    if (texts.has(quote.text)) errors.push(`${label}: duplicate text.`);
    texts.add(quote.text);
    if (/\s{2,}/.test(quote.text) || /\b[A-ZÀ-Ú]{4,}\b/.test(quote.text)) errors.push(`${label}: stray spaces or ALL-CAPS word.`);
  }
  if (typeof quote?.author !== 'string' || !quote.author.trim()) errors.push(`${label}: empty author.`);
  else if (quote.author.length > MAX_AUTHOR_LENGTH) errors.push(`${label}: author longer than ${MAX_AUTHOR_LENGTH} chars.`);

  if (quote?.type !== 'bible' && quote?.type !== 'quote') errors.push(`${label}: invalid type ${String(quote?.type)}.`);
  else perType[quote.type] = (perType[quote.type] ?? 0) + 1;
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`OK: ${quotes.length} entries (${perType.bible ?? 0} bible / ${perType.quote ?? 0} quote), all within the size limits.`);
