import { useCallback, useEffect, useState } from 'react';
import { isVerseMarked, setVerseMarked, type VerseMark } from '../lib/homePreferences';

/** Persisted on/off flag (favorite or bookmark) for one verse, with optimistic toggling. */
export function useVerseMark(mark: VerseMark, verseKey: string | undefined): [boolean, () => void] {
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    if (!verseKey) return;
    let active = true;
    isVerseMarked(mark, verseKey).then((value) => {
      if (active) setMarked(value);
    });
    return () => {
      active = false;
    };
  }, [mark, verseKey]);

  const toggle = useCallback(() => {
    if (!verseKey) return;
    setMarked(!marked);
    void setVerseMarked(mark, verseKey, !marked);
  }, [mark, verseKey, marked]);

  return [marked, toggle];
}
