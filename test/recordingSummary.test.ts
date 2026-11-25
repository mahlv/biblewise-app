import { buildTeaser, extractJsonObject, formatClock, nextMilestone, parseSummary } from '../lib/recordingSummary';

const VALID = {
  title: 'A fé que move montanhas',
  theme: 'Confiança em Deus',
  centralPoints: [{ title: 'Fé', description: 'Confiar mesmo sem ver.' }],
  scripturesCited: [{ reference: 'Hebreus 11:1', text: 'Ora, a fé é a certeza...' }],
  practicalTopics: ['Orar todos os dias', 'Ler a Bíblia'],
  impactQuote: 'Deus nunca chega atrasado.',
};

describe('parseSummary', () => {
  it('accepts a valid summary', () => {
    expect(parseSummary(JSON.stringify(VALID))).toEqual(VALID);
  });

  it('tolerates code fences and surrounding prose', () => {
    expect(parseSummary('Aqui está:\n```json\n' + JSON.stringify(VALID) + '\n```')).toEqual(VALID);
  });

  it('rejects missing or empty required fields', () => {
    expect(parseSummary(JSON.stringify({ ...VALID, title: '' }))).toBeNull();
    expect(parseSummary(JSON.stringify({ ...VALID, impactQuote: undefined }))).toBeNull();
    expect(parseSummary(JSON.stringify({ ...VALID, practicalTopics: 'x' }))).toBeNull();
    expect(parseSummary(JSON.stringify({ ...VALID, centralPoints: [{ title: 'só título' }] }))).toBeNull();
  });

  it('keeps scriptures with empty text and trims strings', () => {
    const summary = parseSummary(JSON.stringify({ ...VALID, scripturesCited: [{ reference: ' João 3:16 ', text: '' }] }));
    expect(summary?.scripturesCited).toEqual([{ reference: 'João 3:16', text: '' }]);
  });

  it('returns null for garbage', () => {
    expect(parseSummary('não é json')).toBeNull();
    expect(extractJsonObject('{ quebrado')).toBeNull();
  });
});

describe('formatting helpers', () => {
  it('formats the clock', () => {
    expect(formatClock(0)).toBe('00:00:00');
    expect(formatClock(3725)).toBe('01:02:05');
    expect(formatClock(-4)).toBe('00:00:00');
  });

  it('maps statuses to milestones', () => {
    expect(nextMilestone('transcribing')).toBe(60);
    expect(nextMilestone('summarizing')).toBe(90);
    expect(nextMilestone('completed')).toBe(100);
  });
});

describe('buildTeaser', () => {
  it('shows the first items and counts the rest', () => {
    expect(buildTeaser(['Salmos 100', '1 Tessalonicenses 5:18', 'João 3:16'])).toBe('Salmos 100, 1 Tessalonicenses 5:18 +1');
    expect(buildTeaser(['Salmos 100', 'João 3:16'])).toBe('Salmos 100, João 3:16');
  });

  it('can show a single item with the count of the others', () => {
    expect(buildTeaser(['Gratidão muda o olhar', 'Louvor diário', 'Registrar'], { maxItems: 1 })).toBe('Gratidão muda o olhar +2');
  });

  it('ellipsizes a long first item and skips items that would not fit', () => {
    expect(buildTeaser(['a'.repeat(60)], { maxChars: 20 })).toBe(`${'a'.repeat(19)}…`);
    expect(buildTeaser(['Gratidão em tempos difíceis', 'Outro título bem longo'], { maxChars: 30 })).toBe('Gratidão em tempos difíceis +1');
  });

  it('ignores blank items and returns an empty string for nothing', () => {
    expect(buildTeaser(['  ', 'Salmos 100', ''])).toBe('Salmos 100');
    expect(buildTeaser([])).toBe('');
  });
});
