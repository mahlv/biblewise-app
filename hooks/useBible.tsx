import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BIBLE_THEMES, DEFAULT_THEME_ID, getTheme } from '../constants/bibleThemes';
import { clampPosition, isKnownVersion, loadAllVersions } from '../lib/bibleLoader';
import { readBiblePreferences, savePosition, saveThemeId, saveVersionCode } from '../lib/biblePreferences';
import type { BibleTheme, BibleVersionMeta, ReadingPosition } from '../types/bible';

interface BibleContextValue {
  ready: boolean;
  versions: BibleVersionMeta[];
  versionCode: string;
  theme: BibleTheme;
  position: ReadingPosition;
  setVersionCode: (code: string) => void;
  setThemeId: (id: string) => void;
  setPosition: (position: ReadingPosition) => void;
}

const BibleContext = createContext<BibleContextValue | null>(null);

const START_POSITION: ReadingPosition = { bookId: 0, chapter: 1 };

export function BibleProvider({ children }: { children: ReactNode }) {
  const versions = useMemo(() => loadAllVersions(), []);
  const [ready, setReady] = useState(false);
  const [versionCode, setVersionCodeState] = useState(versions[0]?.code ?? '');
  const [themeId, setThemeIdState] = useState(DEFAULT_THEME_ID);
  const [position, setPositionState] = useState<ReadingPosition>(START_POSITION);

  useEffect(() => {
    let active = true;
    readBiblePreferences().then((stored) => {
      if (!active) return;
      if (isKnownVersion(stored.versionCode)) setVersionCodeState(stored.versionCode);
      if (stored.themeId && BIBLE_THEMES.some((item) => item.id === stored.themeId)) {
        setThemeIdState(stored.themeId);
      }
      if (stored.position) setPositionState(stored.position);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const setVersionCode = useCallback(
    (code: string) => {
      setVersionCodeState(code);
      // Versions differ slightly in versification, so keep the position valid.
      setPositionState((current) => clampPosition(code, current));
      void saveVersionCode(code);
    },
    [],
  );

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    void saveThemeId(id);
  }, []);

  const setPosition = useCallback((next: ReadingPosition) => {
    setPositionState(next);
    void savePosition(next);
  }, []);

  const value = useMemo<BibleContextValue>(
    () => ({
      ready,
      versions,
      versionCode,
      theme: getTheme(themeId),
      position,
      setVersionCode,
      setThemeId,
      setPosition,
    }),
    [ready, versions, versionCode, themeId, position, setVersionCode, setThemeId, setPosition],
  );

  return <BibleContext.Provider value={value}>{children}</BibleContext.Provider>;
}

export function useBible(): BibleContextValue {
  const context = useContext(BibleContext);
  if (!context) throw new Error('useBible must be used inside <BibleProvider>.');
  return context;
}
