// lib/getBaseUrl.ts
// Bepaalt een absolute base URL voor server-side fetches.
// Volgorde:
// 1. NEXT_PUBLIC_SITE_URL (volledig, zonder trailing slash indien aanwezig)
// 2. NEXT_PUBLIC_BASE_URL
// 3. BASE_URL (fallback interne variabele indien ooit toegevoegd)
// 4. (optioneel) process.env.VERCEL_URL / Amplify domain (niet aanwezig hier)
// 5. Fallback http://localhost:3000

export function getBaseUrl() {
  const cand = process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL;
  if (cand) {
    return cand.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV !== "production") {
    // In dev expliciet
    return "http://localhost:3000";
  }
  // Productie: liever een duidelijke warning zodat we niet met relatieve URLs eindigen
  console.warn(
    "[getBaseUrl] Geen site URL gezet. Gebruik NEXT_PUBLIC_SITE_URL in de omgeving. Valt terug op http://localhost:3000",
  );
  return "http://localhost:3000";
}
