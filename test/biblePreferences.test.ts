import AsyncStorage from '@react-native-async-storage/async-storage';
import { readBiblePreferences, readHighlights, saveHighlights, savePosition, saveThemeId, saveVersionCode } from '../lib/biblePreferences';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('biblePreferences', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns nulls when nothing is stored', async () => {
    expect(await readBiblePreferences()).toEqual({ versionCode: null, themeId: null, position: null });
  });

  it('round-trips version, theme and position', async () => {
    await saveVersionCode('BLIVRE-PT');
    await saveThemeId('slate');
    await savePosition({ bookId: 18, chapter: 23 });
    expect(await readBiblePreferences()).toEqual({
      versionCode: 'BLIVRE-PT',
      themeId: 'slate',
      position: { bookId: 18, chapter: 23 },
    });
  });

  it('round-trips highlights and drops invalid entries', async () => {
    expect(await readHighlights()).toEqual({});
    await saveHighlights({ '0:1': [2, 5] });
    expect(await readHighlights()).toEqual({ '0:1': [2, 5] });
    await AsyncStorage.setItem('@biblewise/verseHighlights', JSON.stringify({ '0:1': [2, 'x', 3.5], '1:1': 'bad' }));
    expect(await readHighlights()).toEqual({ '0:1': [2] });
    await AsyncStorage.setItem('@biblewise/verseHighlights', '[1,2]');
    expect(await readHighlights()).toEqual({});
  });

  it('ignores a corrupted position', async () => {
    await AsyncStorage.setItem('@biblewise/lastReadPosition', '{oops');
    expect((await readBiblePreferences()).position).toBeNull();
    await AsyncStorage.setItem('@biblewise/lastReadPosition', JSON.stringify({ bookId: 'x', chapter: 1 }));
    expect((await readBiblePreferences()).position).toBeNull();
  });
});
