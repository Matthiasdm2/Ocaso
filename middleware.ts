import { type CookieOptions, createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  // Canonical host redirect in production
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NODE_ENV === "production" && siteUrl) {
    try {
      const canonical = new URL(siteUrl);
      const currentHost = req.headers.get("host") || req.nextUrl.host;
      if (currentHost && currentHost !== canonical.host) {
        const redirectUrl = new URL(req.nextUrl.toString());
        redirectUrl.host = canonical.host;
        redirectUrl.protocol = canonical.protocol;
        return NextResponse.redirect(redirectUrl, { status: 308 });
      }
    } catch {
      // ignore invalid siteUrl
    }
  }

  const res = NextResponse.next();
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createServerClient(url, anon, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    });
    const { data, error } = await supabase.auth.getSession();
    if (process.env.NODE_ENV !== "production") {
      console.debug(
        "[middleware] session present=",
        !!data.session,
        "error=",
        error,
      );
    }
  } catch (e) {
    console.warn("[middleware] supabase session refresh failed", e);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
