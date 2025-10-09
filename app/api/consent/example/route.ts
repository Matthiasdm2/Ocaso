export const runtime = 'nodejs';
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
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
  const supabase = createRouteHandlerClient({ cookies });
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
