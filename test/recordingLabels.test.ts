import { changeLanguage } from '../lib/i18n';
import { formatDuration, meetingTypeLabel, progressLabel, statusLabel } from '../lib/recordingLabels';
import { buildRecordingShareText } from '../lib/recordingShareText';
import { formatQuoteDate } from '../lib/quoteStyle';
import i18n from '../lib/i18n';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: () => Promise.resolve(null), setItem: () => Promise.resolve() },
}));

describe('recording labels', () => {
  afterEach(() => changeLanguage('pt-BR'));

  it('names statuses and progress in Portuguese', () => {
    expect(statusLabel('completed')).toBe('IA Resumido');
    expect(statusLabel('summarizing')).toBe('Transcrição Concluída');
    expect(progressLabel('transcribing')).toBe('Transcrevendo em alta fidelidade');
    expect(meetingTypeLabel('bible_school')).toBe('Escola Bíblica');
    expect(meetingTypeLabel(undefined)).toBe('Culto');
  });

  it('formats durations for cards', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(12 * 60)).toBe('12 min');
    expect(formatDuration(3900)).toBe('1h 05min');
  });

  it('follows the app language', async () => {
    await changeLanguage('en');
    expect(statusLabel('completed')).toBe('AI Summarized');
    expect(meetingTypeLabel('youth_service')).toBe('Youth Service');
    expect(formatDuration(3900)).toBe('1h 05min');
    await changeLanguage('de');
    expect(formatDuration(3900)).toBe('1 Std. 05 Min.');
    await changeLanguage('ru');
    expect(statusLabel('failed')).toBe('Ошибка');
  });

  it('uses the right plural form for the practical topics chip', async () => {
    expect(i18n.t('processing.chipTopics', { count: 1 })).toBe('1 tópico prático');
    expect(i18n.t('processing.chipTopics', { count: 3 })).toBe('3 tópicos práticos');
    await changeLanguage('en');
    expect(i18n.t('processing.chipTopics', { count: 1 })).toBe('1 practical topic');
    expect(i18n.t('processing.chipTopics', { count: 3 })).toBe('3 practical topics');
    await changeLanguage('ru');
    expect(i18n.t('processing.chipTopics', { count: 1 })).toBe('1 практическая тема');
    expect(i18n.t('processing.chipTopics', { count: 3 })).toBe('3 практические темы');
    expect(i18n.t('processing.chipTopics', { count: 5 })).toBe('5 практических тем');
  });

  it('writes the WhatsApp summary and the quote date in the app language', async () => {
    const summary = {
      title: 'Gratitude',
      theme: 'Theme',
      centralPoints: [{ title: 'Point', description: 'd' }],
      scripturesCited: [{ reference: 'Psalm 100', text: '' }],
      practicalTopics: [],
      impactQuote: 'Quote',
    };
    await changeLanguage('en');
    const text = buildRecordingShareText({ summary });
    expect(text).toContain('*Key points*');
    expect(text).toContain('*Scriptures:* Psalm 100');
    expect(text).toContain('Summary made with Biblewise');
    expect(formatQuoteDate(new Date(2024, 9, 20).getTime())).toBe('20 OCT 2024');
  });
});
