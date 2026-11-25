import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import { WidgetBanner } from '../components/home/WidgetBanner';
import { QuickAccessGrid } from '../components/home/QuickAccessGrid';
import { changeLanguage, localeTag } from '../lib/i18n';
import { getLastRotationLabel } from '../lib/widgetQuotes';

jest.mock('expo-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return { LinearGradient: View };
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: () => Promise.resolve(null), setItem: () => Promise.resolve() },
}));

/** All text rendered by a tree, in order. */
function textsOf(element: React.ReactElement): string[] {
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(element);
  });
  return tree.root.findAllByType(Text).map((node) => [node.props.children].flat(3).filter((part) => typeof part === 'string').join(''));
}

describe('Home in several languages', () => {
  afterEach(() => changeLanguage('pt-BR'));

  it('renders the widget banner in Portuguese and English', async () => {
    expect(textsOf(<WidgetBanner status="paused" onAdjust={() => undefined} />)).toEqual(
      expect.arrayContaining(['WIDGET PAUSADO', 'Versículo na Tela', 'Toque em Ajustar para reativar', 'Ajustar']),
    );

    await act(() => changeLanguage('en'));
    expect(textsOf(<WidgetBanner status="not_added" onAdjust={() => undefined} />)).toEqual(
      expect.arrayContaining(['ADD TO HOME SCREEN', 'Verse on Screen', 'Tap Adjust to add it', 'Adjust']),
    );
  });

  it('translates the quick access shortcuts', async () => {
    await act(() => changeLanguage('de'));
    const texts = textsOf(<QuickAccessGrid onOpenBible={() => undefined} onOpenRecording={() => undefined} onOpenDiary={() => undefined} />);
    expect(texts).toEqual(expect.arrayContaining(['Digitale Bibel', 'Gottesdienst aufnehmen', 'Mein Tagebuch']));
  });

  it('describes when the widget quote last changed, in the app language', async () => {
    const morning = new Date(2026, 0, 5, 9, 0);
    expect(getLastRotationLabel(morning)).toBe('hoje às 06:00');
    await act(() => changeLanguage('ru'));
    expect(getLastRotationLabel(morning)).toBe('сегодня в 06:00');
    expect(getLastRotationLabel(new Date(2026, 0, 5, 3, 0))).toBe('вчера в 18:00');
  });

  it('formats dates with the locale of the chosen language', async () => {
    expect(localeTag()).toBe('pt-BR');
    await act(() => changeLanguage('no'));
    expect(localeTag()).toBe('nb-NO');
  });
});
