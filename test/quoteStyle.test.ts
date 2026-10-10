import { DEFAULT_QUOTE_STYLE, formatQuoteDate, getBackground, quoteBaseFontSize, sanitizeQuoteStyle, withQuoteMarks } from '../lib/quoteStyle';

describe('quoteStyle', () => {
  it('sanitizes unknown or malformed stored styles field by field', () => {
    expect(sanitizeQuoteStyle(null)).toEqual(DEFAULT_QUOTE_STYLE);
    expect(sanitizeQuoteStyle('x')).toEqual(DEFAULT_QUOTE_STYLE);
    expect(sanitizeQuoteStyle({ backgroundId: 'rose', fontId: 'nope', sizeId: 'large', formatId: 'story' })).toEqual({
      backgroundId: 'rose',
      fontId: DEFAULT_QUOTE_STYLE.fontId,
      sizeId: 'large',
      formatId: 'story',
    });
  });

  it('falls back to the first background for unknown ids', () => {
    expect(getBackground('nope').id).toBe('night');
  });

  it('shrinks the font for longer quotes', () => {
    expect(quoteBaseFontSize(60)).toBeGreaterThan(quoteBaseFontSize(200));
    expect(quoteBaseFontSize(200)).toBeGreaterThan(quoteBaseFontSize(500));
  });

  it('adds typographic quotes exactly once', () => {
    expect(withQuoteMarks('A paz.')).toBe('“A paz.”');
    expect(withQuoteMarks('"A paz."')).toBe('“A paz.”');
    expect(withQuoteMarks('“A paz.”')).toBe('“A paz.”');
  });

  it('formats the date in Portuguese caps', () => {
    expect(formatQuoteDate(new Date(2024, 9, 20).getTime())).toBe('20 OUT 2024');
  });
});
