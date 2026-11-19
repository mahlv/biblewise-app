import { buildRecordingShareText, recordingFileName } from '../lib/recordingShareText';
import type { RecordingSummary } from '../lib/recordingSummary';

const summary: RecordingSummary = {
  title: 'O Poder da Gratidão',
  theme: 'Gratidão transforma a perspectiva.',
  centralPoints: [
    { title: 'Gratidão muda o olhar', description: 'a' },
    { title: 'Louvor diário', description: 'b' },
    { title: 'Registrar as graças', description: 'c' },
    { title: 'Quarto ponto', description: 'd' },
  ],
  scripturesCited: [
    { reference: 'Salmos 100', text: '' },
    { reference: '1 Tessalonicenses 5:18', text: 'Agradecei em tudo' },
  ],
  practicalTopics: [],
  impactQuote: 'Quem agradece, enxerga.',
};

describe('buildRecordingShareText', () => {
  it('builds the full message with WhatsApp formatting', () => {
    expect(buildRecordingShareText({ summary, preacher: 'Pastor Marcos', church: 'Igreja Central' })).toBe(
      [
        '*O Poder da Gratidão*',
        '_Pastor Marcos · Igreja Central_',
        '',
        'Gratidão transforma a perspectiva.',
        '',
        '*Pontos centrais*',
        '1. Gratidão muda o olhar',
        '2. Louvor diário',
        '3. Registrar as graças',
        '',
        '*Escrituras:* Salmos 100, 1 Tessalonicenses 5:18',
        '',
        '“Quem agradece, enxerga.”',
        '',
        'Resumo feito com o Biblewise',
      ].join('\n'),
    );
  });

  it('keeps only three points and skips missing sections', () => {
    const text = buildRecordingShareText({
      summary: { ...summary, theme: '', scripturesCited: [], impactQuote: '' },
    });
    expect(text).not.toContain('Quarto ponto');
    expect(text).not.toContain('Escrituras');
    expect(text).not.toContain('“');
    expect(text.split('\n')[1]).toBe('');
    expect(text.endsWith('Resumo feito com o Biblewise')).toBe(true);
  });
});

describe('recordingFileName', () => {
  it('slugifies the title without accents', () => {
    expect(recordingFileName('O Poder da Gratidão em Tempos Difíceis!')).toBe('Pregacao-o-poder-da-gratidao-em-tempos-dificeis.m4a');
  });

  it('falls back when there is no usable title and limits the length', () => {
    expect(recordingFileName(undefined)).toBe('Pregacao-gravacao.m4a');
    expect(recordingFileName('???')).toBe('Pregacao-gravacao.m4a');
    expect(recordingFileName('a'.repeat(120)).length).toBeLessThanOrEqual('Pregacao-'.length + 50 + '.m4a'.length);
  });
});
