// lib/url.ts
// Safely construct a URL from possibly-relative input by falling back to a known base.
export function toURL(input: string): URL {
  try {
    // Works when input is absolute
    return new URL(input);
  } catch (_) {
    const baseEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
    const base = baseEnv && /^https?:\/\//.test(baseEnv)
      ? baseEnv
      : "http://localhost:3000";
    return new URL(input, base);
  }
}
