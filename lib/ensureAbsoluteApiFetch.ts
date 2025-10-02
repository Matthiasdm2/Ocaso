// Wrap global fetch on the server to ensure relative /api/* requests become absolute.
// This guards against any lingering relative fetch usage in server components.
import { getBaseUrl } from "./getBaseUrl";

// Only patch once and only in a server (Node) environment.
type PatchedGlobal = typeof globalThis & { __OCASO_FETCH_PATCHED__?: boolean };
const g = globalThis as PatchedGlobal;

if (!g.__OCASO_FETCH_PATCHED__) {
  const originalFetch: typeof fetch = g.fetch.bind(g);
  g.__OCASO_FETCH_PATCHED__ = true;

  g.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      let url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
      if (typeof url === 'string' && url.startsWith('/api/')) {
        const base = getBaseUrl();
        // Avoid double slashes
        url = base.replace(/\/$/, '') + url;
        if (process.env.NODE_ENV !== 'production') {
          // Lightweight debug in dev
          // eslint-disable-next-line no-console
          console.log('[fetch patch] Rewriting relative API URL ->', url);
        }
        if (typeof input === 'string') {
          input = url;
        } else if (input instanceof Request) {
          input = new Request(url, input as RequestInit);
        }
      }
    } catch (e) {
      // Silent safeguard; we don't want to break fetch
    }
  return originalFetch(input as RequestInfo, init);
  }) as typeof fetch;
}
