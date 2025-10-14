export const runtime = "nodejs";
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { resolveServerConsent } from "@/lib/consentServer";

export const dynamic = "force-dynamic";

type ProfilePreferences = {
  cookieConsent?: {
    functional?: boolean;
    analytics?: boolean;
    marketing?: boolean;
    updatedAt?: string;
  };
} | null;

export async function GET(req: Request) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  let profilePrefs: ProfilePreferences = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("preferences").eq(
      "id",
      user.id,
    ).maybeSingle();
    profilePrefs = (data?.preferences as ProfilePreferences) || null;
  }
  const consent = resolveServerConsent({
    cookieHeader: req.headers.get("cookie"),
    profilePreferences: profilePrefs,
  });
  return NextResponse.json({ consent });
}
