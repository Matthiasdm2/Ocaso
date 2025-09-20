"use client";
import { useEffect } from 'react';

import { getCookiePrefs } from '@/lib/cookiePrefs';
import { registerConsentLoader } from '@/lib/useConsent';

export function ConsentBootstrap() {
  useEffect(() => {
    // Register analytics loader
    registerConsentLoader('analytics', () => {
      if (document.getElementById('plausible-script')) return;
      const s = document.createElement('script');
      s.id = 'plausible-script';
      s.defer = true;
      s.setAttribute('data-domain', 'ocaso.app');
      s.src = 'https://plausible.io/js/script.js';
      document.head.appendChild(s);
    });
    // Register marketing loader (placeholder)
    registerConsentLoader('marketing', () => {
      if (document.getElementById('marketing-tag')) return;
      const s = document.createElement('script');
      s.id = 'marketing-tag';
      s.async = true;
      s.src = 'https://example-ad-network/tag.js';
      document.head.appendChild(s);
    });
    // If prefs already allow, dispatch event to trigger loaders (they run via useConsent in components that mount after) – or just force-run by simulating change.
    const prefs = getCookiePrefs();
    if (prefs.analytics || prefs.marketing) {
      // Trigger a synthetic event so any listeners (including useConsent) can act.
      window.dispatchEvent(new CustomEvent('ocaso:cookie-prefs-changed', { detail: prefs }));
    }
  }, []);
  return null;
}

export default ConsentBootstrap;
