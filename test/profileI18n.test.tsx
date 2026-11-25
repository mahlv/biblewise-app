import { act } from 'react-test-renderer';
import { changeLanguage } from '../lib/i18n';
import { notificationMessage } from '../lib/notificationText';
import { WIDGET_BACKGROUNDS, WIDGET_FONTS } from '../lib/widgetStyle';
import i18n from '../lib/i18n';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: () => Promise.resolve(null), setItem: () => Promise.resolve() },
}));

describe('notifications, profile and widget in several languages', () => {
  afterEach(() => changeLanguage('pt-BR'));

  it('writes notification headlines in the app language', async () => {
    const like = { type: 'like', prayerType: 'request', actorName: 'Maria', prayerTitle: 'Paz' } as const;
    expect(notificationMessage(like).headline).toBe('Maria curtiu seu pedido');
    await act(() => changeLanguage('en'));
    expect(notificationMessage(like).headline).toBe('Maria liked your request');
    expect(notificationMessage({ ...like, type: 'comment', prayerType: 'testimony' }).headline).toBe('Maria commented on your testimony');
    expect(notificationMessage({ ...like, actorName: ' ' }).headline).toBe('Someone liked your request');
    await act(() => changeLanguage('de'));
    expect(notificationMessage({ ...like, type: 'comment' }).headline).toBe('Maria hat dein Anliegen kommentiert');
  });

  it('names every widget background and font through translation keys', async () => {
    await act(() => changeLanguage('es'));
    const names = [...WIDGET_BACKGROUNDS, ...WIDGET_FONTS].map((item) => i18n.t(item.labelKey));
    expect(names).toContain('Automático');
    expect(names).toContain('Amanecer');
    expect(names).toContain('Cursiva');
    for (const name of names) expect(name).not.toMatch(/^(quote|widget)\./);
  });

  it('translates the Android widget texts', async () => {
    await act(() => changeLanguage('fr'));
    expect(i18n.t('widget.android.paused')).toBe('Widget en pause');
    expect(i18n.t('widget.android.openBible')).toBe('Ouvrir la Bible');
  });
});
