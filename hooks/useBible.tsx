import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BIBLE_THEMES, DEFAULT_THEME_ID, getTheme } from '../constants/bibleThemes';
import { clampPosition, ensureVersionLoaded, isKnownVersion, loadAllVersions } from '../lib/bibleLoader';
import { readBiblePreferences, savePosition, saveThemeId, saveVersionCode } from '../lib/biblePreferences';
import type { BibleTheme, BibleVersionMeta, ReadingPosition } from '../types/bible';

interface BibleContextValue {
  ready: boolean;
  versions: BibleVersionMeta[];
  versionCode: string;
  theme: BibleTheme;
  position: ReadingPosition;
  /** Code of the version being loaded (asset versions are read on demand), or `null`. */
  loadingVersionCode: string | null;
  /** Loads and switches to a version. Resolves `false` (keeping the current one) if loading fails. */
  setVersionCode: (code: string) => Promise<boolean>;
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
  const [loadingVersionCode, setLoadingVersionCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    readBiblePreferences().then(async (stored) => {
      // Asset versions must be in memory before the Bible screen reads them.
      let savedVersion: string | null = null;
      if (isKnownVersion(stored.versionCode)) {
        const code = stored.versionCode;
        savedVersion = await ensureVersionLoaded(code).then(
          () => code,
          () => null,
        );
      }
      if (!active) return;
      if (savedVersion) setVersionCodeState(savedVersion);
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

  const setVersionCode = useCallback(async (code: string): Promise<boolean> => {
    if (!isKnownVersion(code)) return false;
    setLoadingVersionCode(code);
    try {
      await ensureVersionLoaded(code);
    } catch {
      return false;
    } finally {
      setLoadingVersionCode(null);
    }
    setVersionCodeState(code);
    // Versions differ slightly in versification, so keep the position valid.
    setPositionState((current) => clampPosition(code, current));
    void saveVersionCode(code);
    return true;
  }, []);

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
      loadingVersionCode,
      setVersionCode,
      setThemeId,
      setPosition,
    }),
    [ready, versions, versionCode, themeId, position, loadingVersionCode, setVersionCode, setThemeId, setPosition],
  );

  return <BibleContext.Provider value={value}>{children}</BibleContext.Provider>;
}

export function useBible(): BibleContextValue {
  const context = useContext(BibleContext);
  if (!context) throw new Error('useBible must be used inside <BibleProvider>.');
  return context;
}
