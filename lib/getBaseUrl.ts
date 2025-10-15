// lib/getBaseUrl.ts
// Bepaalt een absolute base URL voor server-side fetches.
// Volgorde:
// 1. NEXT_PUBLIC_SITE_URL (volledig, zonder trailing slash indien aanwezig)
// 2. NEXT_PUBLIC_BASE_URL
// 3. BASE_URL (fallback interne variabele indien ooit toegevoegd)
// 4. (optioneel) process.env.VERCEL_URL / Amplify domain (niet aanwezig hier)
// 5. Fallback http://localhost:3000

export function getBaseUrl() {
  // 1) Expliciete env-configuratie heeft voorrang
  const cand = process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL;
  if (cand) {
    return cand.replace(/\/$/, "");
  }

  // 2) In de browser: val terug op het huidige origin (correct domain in prod)
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  // 3) Node/dev fallback
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  // 4) Productie server without env: laatste redmiddel (liever waarschuwing)
  console.warn(
    "[getBaseUrl] Geen site URL gezet en geen window.origin beschikbaar. Zet NEXT_PUBLIC_SITE_URL in de omgeving.",
  );
  return "http://localhost:3000";
}
