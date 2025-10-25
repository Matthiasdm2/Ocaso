
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  // Canonical host redirect in production
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NODE_ENV === "production" && siteUrl) {
    try {
      const canonicalRaw = siteUrl.startsWith("http")
        ? siteUrl
        : `https://${siteUrl}`;
      const canonical = new URL(canonicalRaw);
      const targetProtocol = (canonical.protocol || "https:").toLowerCase();

      // Respect reverse proxy headers for accurate scheme/host
      const fwdHost =
        (req.headers.get("x-forwarded-host") || req.headers.get("host") ||
          req.nextUrl.host || "").toLowerCase();
      const fwdProto =
        (req.headers.get("x-forwarded-proto") ||
          req.nextUrl.protocol.replace(":", "") || "https").toLowerCase();
      const currentHostname = fwdHost.split(":")[0];
      const currentProtocol = `${fwdProto}:`;

      // Skip redirect for localhost or preview domains
      const isLocal = currentHostname === "localhost";
      const isPreview = /\.(vercel\.app|amplifyapp\.com)$/i.test(
        currentHostname,
      );

      // Enforce HTTPS only; do not change hostname to avoid loops with external redirects

      // Only enforce HTTPS; do not change hostname to avoid loops with external redirects
      if (!isLocal && !isPreview) {
        const needsHttps = currentProtocol !== targetProtocol;
        if (needsHttps) {
          const redirectUrl = new URL(req.nextUrl.toString());
          redirectUrl.protocol = targetProtocol; // force https
          redirectUrl.port = ""; // drop any explicit port
          return NextResponse.redirect(redirectUrl, { status: 308 });
        }
        // If host is unexpected AND protocol is fine, do nothing to avoid loops
      }
    } catch {
      // ignore invalid siteUrl
    }
  }

  const res = NextResponse.next();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error('[middleware] Supabase env vars missing', {
      hasUrl: !!url,
      hasKey: !!anon,
    });
    // Voor admin routes: redirect naar login
    if (req.nextUrl.pathname.startsWith('/admin')) {
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
    // Voor andere routes: 503
    return new NextResponse('Service unavailable', { status: 503 });
  }
  try {
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
