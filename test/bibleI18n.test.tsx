import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import { QuickReferenceChips } from '../components/QuickReferenceChips';
import { ThemeRow } from '../components/ThemeRow';
import { BIBLE_THEMES } from '../constants/bibleThemes';
import { changeLanguage } from '../lib/i18n';
import { languageName } from '../lib/bibleVersions';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: () => Promise.resolve(null), setItem: () => Promise.resolve() },
}));

function textsOf(element: React.ReactElement): string[] {
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(element);
  });
  return tree.root.findAllByType(Text).map((node) => [node.props.children].flat(3).filter((part) => typeof part === 'string').join(''));
}

describe('Bible tab in several languages', () => {
  afterEach(() => changeLanguage('pt-BR'));

  it('labels the quick chips with the book names of the Bible version, not the app language', async () => {
    await act(() => changeLanguage('en'));
    const texts = textsOf(<QuickReferenceChips versionCode="TB-PT" onSelect={() => undefined} />);
    expect(texts).toEqual(expect.arrayContaining(['QUICK:', 'Gênesis 1', 'João 3:16']));
  });

  it('translates theme names and the premium/free badge', async () => {
    const [alabaster, rose] = BIBLE_THEMES;
    await act(() => changeLanguage('de'));
    expect(textsOf(<ThemeRow theme={alabaster!} selected locked={false} onPress={() => undefined} />)).toEqual(
      expect.arrayContaining(['Standard / Alabaster', 'Kostenlos']),
    );
    expect(textsOf(<ThemeRow theme={rose!} selected={false} locked onPress={() => undefined} />)).toEqual(
      expect.arrayContaining(['Himmlische Rose', 'Premium']),
    );
  });

  it('names the languages of the Bible versions in the app language', async () => {
    expect(languageName('en')).toBe('Inglês');
    await act(() => changeLanguage('fr'));
    expect(languageName('en')).toBe('Anglais');
    expect(languageName('nb-NO')).toBe('Norvégien');
    expect(languageName('xx')).toBe('xx');
  });
});
