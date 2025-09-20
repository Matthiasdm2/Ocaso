import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Probeert de ingelogde gebruiker op te halen via cookies. Valt terug op Authorization: Bearer <token> wanneer aanwezig.
 */
export async function getServerUser(req: Request) {
  const supabase = supabaseServer();
  // Eerst normale cookie sessie
  const { data: { user: initialUser } } = await supabase.auth.getUser();
  let authUser = initialUser;
  if (!authUser) {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      // Supabase JS ondersteunt getUser(jwt)
      try {
        const r = await supabase.auth.getUser(token);
    authUser = r.data.user || null;
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.debug("[getServerUser] fallback bearer token faalde", e);
        }
      }
    }
  }
  return { user: authUser };
}
