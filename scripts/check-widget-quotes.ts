/**
 * Validates assets/widget/quotes.json (the single source for both native widgets).
 * Run with: node --no-warnings --experimental-strip-types scripts/check-widget-quotes.ts
 */
import { readFileSync } from 'node:fs';

const MIN_QUOTES = 50;
const MAX_TEXT_LENGTH = 200;

const quotes = JSON.parse(readFileSync(new URL('../assets/widget/quotes.json', import.meta.url), 'utf8')) as unknown;
const errors: string[] = [];

if (!Array.isArray(quotes)) {
  console.error('quotes.json must be an array.');
  process.exit(1);
}
if (quotes.length < MIN_QUOTES) errors.push(`Expected at least ${MIN_QUOTES} quotes, found ${quotes.length}.`);

const ids = new Set<string>();
for (const [index, quote] of quotes.entries()) {
  const label = `#${index + 1}`;
  if (typeof quote?.id !== 'string' || !quote.id) errors.push(`${label}: missing id.`);
  else if (ids.has(quote.id)) errors.push(`${label}: duplicate id ${quote.id}.`);
  else ids.add(quote.id);

  if (typeof quote?.text !== 'string' || !quote.text.trim()) errors.push(`${label}: empty text.`);
  else if (quote.text.length > MAX_TEXT_LENGTH) errors.push(`${label}: text longer than ${MAX_TEXT_LENGTH} chars.`);
  if (typeof quote?.author !== 'string' || !quote.author.trim()) errors.push(`${label}: empty author.`);
  if (quote?.type !== 'bible' && quote?.type !== 'philosopher') errors.push(`${label}: invalid type ${String(quote?.type)}.`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`OK: ${quotes.length} quotes.`);
