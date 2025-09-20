// Client-side helpers for managing cookie preference categories.
// Stored in a cookie: ocaso_cookie_prefs={ functional:boolean, analytics:boolean, marketing:boolean, updatedAt:string }
// Essential cookies are always enabled and not user-toggleable.

export type CookiePrefs = {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt?: string;
};

const COOKIE_NAME = 'ocaso_cookie_prefs';

const DEFAULT_PREFS: CookiePrefs = {
  functional: true,
  analytics: false,
  marketing: false,
};

export function parseCookieString(raw: string | undefined | null): Record<string, string> {
  if (!raw) return {};
  return raw.split(/;\s*/).reduce<Record<string, string>>((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const k = decodeURIComponent(part.slice(0, idx).trim());
    const v = decodeURIComponent(part.slice(idx + 1).trim());
    acc[k] = v;
    return acc;
  }, {});
}

export function getCookiePrefs(): CookiePrefs {
  if (typeof document === 'undefined') return DEFAULT_PREFS; // SSR safeguard
  try {
    const all = parseCookieString(document.cookie);
    const raw = all[COOKIE_NAME];
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      functional: !!parsed.functional,
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setCookiePrefs(next: CookiePrefs) {
  if (typeof document === 'undefined') return;
  const value = JSON.stringify({ ...next, updatedAt: new Date().toISOString() });
  const maxAge = 60 * 60 * 24 * 730; // ~2 jaar
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function updateCookiePrefs(partial: Partial<CookiePrefs>): CookiePrefs {
  const current = getCookiePrefs();
  const next: CookiePrefs = { ...current, ...partial };
  setCookiePrefs(next);
  return next;
}
