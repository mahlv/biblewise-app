import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { DEFAULT_DENOMINATION, type AgeRange, type Denomination } from '../lib/onboardingOptions';
import { getOrCreateAnonymousId, readOnboarding, setOnboardingCompleted } from '../lib/onboardingStorage';

/**
 * Global onboarding state.
 *
 * - `status`: `loading` while AsyncStorage is being read; the root layout does
 *   not pick a route before that (avoids flashing the wrong screen).
 * - `draft`: in-progress choices shared across steps — going back from step 2
 *   to step 1 keeps the selected age range.
 * - `complete()`: writes to Convex and only then sets the local flag. If Convex
 *   fails, the user stays in the flow and can retry.
 */

interface Draft {
  ageRange: AgeRange | null;
  denomination: Denomination;
}

interface OnboardingContextValue {
  status: 'loading' | 'ready';
  completed: boolean;
  anonymousId: string | null;
  draft: Draft;
  setAgeRange: (ageRange: AgeRange) => void;
  setDenomination: (denomination: Denomination) => void;
  complete: () => Promise<void>;
  /** Back to the welcome flow (keeps the `anonymousId`, so no duplicate user). */
  reset: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const INITIAL_DRAFT: Draft = { ageRange: null, denomination: DEFAULT_DENOMINATION };

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [completed, setCompleted] = useState(false);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT);

  const createAnonymousUser = useMutation(api.users.createAnonymousUser);

  useEffect(() => {
    let active = true;
    readOnboarding().then((stored) => {
      if (!active) return;
      setAnonymousId(stored.anonymousId);
      setCompleted(stored.onboardingCompleted);
      setStatus('ready');
    });
    return () => {
      active = false;
    };
  }, []);

  const setAgeRange = useCallback((ageRange: AgeRange) => {
    setDraft((current) => ({ ...current, ageRange }));
  }, []);

  const setDenomination = useCallback((denomination: Denomination) => {
    setDraft((current) => ({ ...current, denomination }));
  }, []);

  const complete = useCallback(async () => {
    if (!draft.ageRange) throw new Error('Age range must be selected before completing onboarding.');

    const id = await getOrCreateAnonymousId();
    await createAnonymousUser({
      anonymousId: id,
      ageRange: draft.ageRange,
      denomination: draft.denomination,
    });
    await setOnboardingCompleted(true);

    setAnonymousId(id);
    setCompleted(true);
  }, [createAnonymousUser, draft]);

  const reset = useCallback(async () => {
    await setOnboardingCompleted(false);
    setDraft(INITIAL_DRAFT);
    setCompleted(false);
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({ status, completed, anonymousId, draft, setAgeRange, setDenomination, complete, reset }),
    [status, completed, anonymousId, draft, setAgeRange, setDenomination, complete, reset],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used inside <OnboardingProvider>.');
  return context;
}
