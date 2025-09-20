// Server-side helper to read cookie consent without importing client hooks.
import type { CookiePrefs } from './cookiePrefs';

export function parseConsentFromCookie(rawCookieHeader: string | null | undefined): Partial<CookiePrefs> | null {
  if (!rawCookieHeader) return null;
  try {
    const match = rawCookieHeader.split(/;\s*/).find(p => p.startsWith('ocaso_cookie_prefs='));
    if (!match) return null;
    const value = decodeURIComponent(match.split('=').slice(1).join('='));
    const obj = JSON.parse(value);
    return {
      functional: !!obj.functional,
      analytics: !!obj.analytics,
      marketing: !!obj.marketing,
      updatedAt: obj.updatedAt,
    };
  } catch {
    return null;
  }
}

// Merge precedence: cookie > stored profile preferences > defaults
interface RawPreferences { cookieConsent?: Partial<CookiePrefs> & { updatedAt?: string } }
export function resolveServerConsent(opts: {
  cookieHeader?: string | null;
  profilePreferences?: RawPreferences | null;
}): CookiePrefs {
  const defaults: CookiePrefs = { functional: true, analytics: false, marketing: false };
  const fromCookie = parseConsentFromCookie(opts.cookieHeader || null) || {};
  const fromProfile = opts.profilePreferences?.cookieConsent || {};
  return {
    functional: coalesceBool(fromCookie.functional, fromProfile.functional, defaults.functional),
    analytics: coalesceBool(fromCookie.analytics, fromProfile.analytics, defaults.analytics),
    marketing: coalesceBool(fromCookie.marketing, fromProfile.marketing, defaults.marketing),
    updatedAt: (fromCookie as { updatedAt?: string }).updatedAt || (fromProfile as { updatedAt?: string }).updatedAt,
  };
}

function coalesceBool(...vals: (boolean | undefined)[]): boolean {
  for (const v of vals) if (typeof v === 'boolean') return v;
  return false;
}

// Example usage (in a route):
// const consent = resolveServerConsent({ cookieHeader: req.headers.get('cookie'), profilePreferences: dbRow.preferences });
// if (!consent.analytics) skip analytics aggregation, etc.