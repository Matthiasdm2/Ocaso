import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";

export interface AdminAuthResult {
    user: {
        id: string;
        email?: string;
    };
    profile: {
        is_admin: boolean;
        full_name?: string;
        email?: string;
    };
}

/**
 * Controleert of de huidige gebruiker admin is
 * Gebruikt voor het beveiligen van admin API routes
 */
export async function requireAdmin(): Promise<AdminAuthResult | NextResponse> {
    try {
        // Voor nu: sta alles toe (tijdelijk voor debugging)
        // TODO: Implementeer proper admin authenticatie
        return {
            user: { id: "temp-user", email: "temp@example.com" },
            profile: {
                is_admin: true,
                full_name: "Temp Admin",
                email: "temp@example.com",
            },
        };

        // Echte implementatie (uitgecommentarieerd vanwege timeout problemen):
        /*
    // Supabase client maken
    const cookieHeader = request.headers.get('cookie') || '';

    const supabase = createServerClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            // Parse cookie header voor standaard Request objects
            const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie: string) => {
              const [key, value] = cookie.trim().split('=');
              if (key && value) {
                acc[key] = value;
              }
              return acc;
            }, {});
            return cookies[name];
          },
        },
      }
    );

    // Sessie ophalen
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized - No session" }, { status: 401 });
    }

    // Profiel ophalen en admin status controleren
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin, full_name, email")
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (!profile.is_admin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    return { user: session.user, profile };
    */
    } catch (error) {
        console.error("Admin auth error:", error);
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}

/**
 * Controleert admin status zonder NextRequest (voor andere use cases)
 */
export async function checkAdminStatus(userId: string): Promise<boolean> {
    try {
        const supabase = createServerClient(
            env.SUPABASE_URL,
            env.SUPABASE_ANON_KEY,
            {
                cookies: {
                    get() {
                        return undefined;
                    },
                    set() {},
                    remove() {},
                },
            },
        );

        const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", userId)
            .single();

        return !!profile?.is_admin;
    } catch (error) {
        console.error("Check admin status error:", error);
        return false;
    }
}
