import { useCallback, useEffect, useState } from 'react';

import { type CookiePrefs, getCookiePrefs, setCookiePrefs, updateCookiePrefs } from './cookiePrefs';

export type ConsentCategory = 'functional' | 'analytics' | 'marketing';

// Loader registry (scripts die pas na toestemming mogen laden)
type Loader = () => void;
const loaders: Partial<Record<ConsentCategory, Loader[]>> = {};

export function registerConsentLoader(category: ConsentCategory, fn: Loader) {
  if (!loaders[category]) loaders[category] = [];
  loaders[category]!.push(fn);
}

function runLoaders(prefs: CookiePrefs) {
  (['analytics','marketing'] as ConsentCategory[]).forEach(cat => {
    if (prefs[cat]) loaders[cat]?.forEach(l => { try { l(); } catch { /* ignore */ } });
  });
}

export function dispatchConsentChange(prefs: CookiePrefs) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('ocaso:cookie-prefs-changed', { detail: prefs }));
}

export function useConsent() {
  const [prefs, setPrefs] = useState<CookiePrefs>(() => getCookiePrefs());

  // Initial loader run
  useEffect(() => { runLoaders(prefs); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setAll = useCallback((next: CookiePrefs) => {
    setCookiePrefs(next);
    setPrefs(next);
    dispatchConsentChange(next);
    runLoaders(next);
  }, []);

  const update = useCallback((partial: Partial<CookiePrefs>) => {
    const next = updateCookiePrefs(partial);
    setPrefs(next);
    dispatchConsentChange(next);
    if (partial.analytics || partial.marketing) runLoaders(next);
  }, []);

  return { prefs, setAll, update };
}

// Example default analytics loader registration (can be overridden later)
// Consumers can import { registerConsentLoader } and add their own.