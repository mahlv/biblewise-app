import { extractJsonObject, formatClock, formatDuration, nextMilestone, parseSummary, progressLabel, statusLabel } from '../lib/recordingSummary';

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

  it('formats durations for cards', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(12 * 60)).toBe('12 min');
    expect(formatDuration(3900)).toBe('1h 05min');
  });

  it('maps statuses to labels and milestones', () => {
    expect(statusLabel('completed')).toBe('IA Resumido');
    expect(statusLabel('summarizing')).toBe('Transcrição Concluída');
    expect(progressLabel('transcribing')).toBe('Transcrevendo em alta fidelidade');
    expect(nextMilestone('transcribing')).toBe(60);
    expect(nextMilestone('summarizing')).toBe(90);
    expect(nextMilestone('completed')).toBe(100);
  });
});
