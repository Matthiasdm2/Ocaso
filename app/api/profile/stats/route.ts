export const runtime = "nodejs";
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Bereken totale verkochte waarde uit payments_stub voor deze gebruiker
    const { data: payments, error: paymentsError } = await supabase
      .from("payments_stub")
      .select("amount_eur, status")
      .eq("user_id", user.id);

    let soldValue = 0;
    if (!paymentsError && payments) {
      // Tel alleen completed payments
      soldValue = payments
        .filter((payment) => payment.status === "completed")
        .reduce((sum, payment) => sum + (payment.amount_eur || 0), 0);
    }

    return NextResponse.json({ soldValue });
  } catch (e) {
    console.error("Profile stats error:", e);
    return NextResponse.json({ soldValue: 0 }, { status: 200 });
  }
}
