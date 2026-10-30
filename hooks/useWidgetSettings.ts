import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  DEFAULT_WIDGET_SETTINGS,
  readWidgetSettings,
  saveWidgetSettings,
  type WidgetSettings,
} from '../lib/widgetSettings';
import { isWidgetPlaced, syncWidget } from '../lib/widgetSync';

interface WidgetState {
  settings: WidgetSettings;
  /** `null` while unknown (loading, iOS, or a build without the native module). */
  placed: boolean | null;
  loaded: boolean;
  /** Saves the change and redraws the native widget right away. */
  update: (patch: Partial<WidgetSettings>) => void;
}

/** Widget settings plus placement status, refreshed every time the screen gains focus. */
export function useWidgetSettings(): WidgetState {
  const [settings, setSettings] = useState<WidgetSettings>(DEFAULT_WIDGET_SETTINGS);
  const [placed, setPlaced] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([readWidgetSettings(), isWidgetPlaced()]).then(([stored, isPlaced]) => {
        if (!active) return;
        setSettings(stored);
        setPlaced(isPlaced);
        setLoaded(true);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const update = useCallback(
    (patch: Partial<WidgetSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      void saveWidgetSettings(next).then(syncWidget);
    },
    [settings],
  );

  return { settings, placed, loaded, update };
}
