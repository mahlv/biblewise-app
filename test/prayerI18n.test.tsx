import { act, create } from 'react-test-renderer';
import { TextInput } from 'react-native';
import { CommentComposer } from '../components/CommentComposer';
import { changeLanguage } from '../lib/i18n';
import { PRAYER_CATEGORIES } from '../lib/prayerCategories';
import { anonymousName, authorDisplayName, categoryLabel, prayerTypeLabel } from '../lib/prayerLabels';
import { formatTimeAgo } from '../lib/timeAgo';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: () => Promise.resolve(null), setItem: () => Promise.resolve() },
}));

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const NOW = new Date(2026, 10, 12, 15, 0, 0).getTime();
const daysAgo = (days: number) => new Date(2026, 10, 12 - days, 9, 0).getTime();

describe('prayer wall in several languages', () => {
  afterEach(() => changeLanguage('pt-BR'));

  it('keeps the stored Portuguese category and translates only its label', async () => {
    expect(categoryLabel('FAMÍLIA & SAÚDE')).toBe('FAMÍLIA & SAÚDE');
    await act(() => changeLanguage('en'));
    expect(categoryLabel('FAMÍLIA & SAÚDE')).toBe('FAMILY & HEALTH');
    expect(prayerTypeLabel('testimony')).toBe('Testimony');
    // Every stored category has a translation (none falls back to a raw key).
    for (const category of PRAYER_CATEGORIES) expect(categoryLabel(category)).not.toMatch(/^prayer\./);
  });

  it('replaces the anonymous name sent by the server', async () => {
    const anonymous = { name: 'Irmão em Cristo', isAnonymous: true };
    expect(authorDisplayName(anonymous)).toBe('Irmão em Cristo');
    await act(() => changeLanguage('de'));
    expect(authorDisplayName(anonymous)).toBe('Bruder in Christus');
    expect(authorDisplayName({ name: 'Maria Silva', isAnonymous: false })).toBe('Maria Silva');
    expect(anonymousName()).toBe('Bruder in Christus');
  });

  it('writes relative times in the app language, with plural forms', async () => {
    expect(formatTimeAgo(NOW - 5 * MINUTE, NOW)).toBe('Há 5min');
    await act(() => changeLanguage('en'));
    expect(formatTimeAgo(NOW - 10 * 1000, NOW)).toBe('Now');
    expect(formatTimeAgo(NOW - 2 * HOUR, NOW)).toBe('2h ago');
    expect(formatTimeAgo(daysAgo(1), NOW)).toBe('Yesterday');
    expect(formatTimeAgo(daysAgo(3), NOW)).toBe('3 days ago');
    expect(formatTimeAgo(new Date(2026, 9, 20, 9, 0).getTime(), NOW)).toBe('20 oct');
    await act(() => changeLanguage('ru'));
    expect(formatTimeAgo(daysAgo(2), NOW)).toBe('2 дня назад');
    expect(formatTimeAgo(daysAgo(5), NOW)).toBe('5 дней назад');
  });

  it('shows the comment box in the chosen language', async () => {
    await act(() => changeLanguage('es'));
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(<CommentComposer onSubmit={() => Promise.resolve()} />);
    });
    expect(tree.root.findByType(TextInput).props.placeholder).toBe('Escribe un comentario...');
    expect(tree.root.findAll((node) => node.props.accessibilityLabel === 'Enviar comentario').length).toBeGreaterThan(0);
  });
});
