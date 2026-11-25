import { isKnownVersion } from '../lib/bibleLoader';
import { SUPPORTED_LANGUAGES } from '../lib/i18n';
import { defaultVersionCodeFor } from '../lib/bibleVersions';

describe('defaultVersionCodeFor', () => {
  it('uses WEB for English and TB-PT for Portuguese', () => {
    expect(defaultVersionCodeFor('en')).toBe('WEB-EN');
    expect(defaultVersionCodeFor('pt-BR')).toBe('TB-PT');
  });

  it('falls back to English for unknown languages', () => {
    expect(defaultVersionCodeFor('ja')).toBe('WEB-EN');
  });

  it('points every supported app language to a registered version', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(isKnownVersion(defaultVersionCodeFor(language.code))).toBe(true);
    }
  });
});
