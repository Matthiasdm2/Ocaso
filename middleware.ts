import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  try {
    const supabase = createMiddlewareClient({ req, res });
    const { data, error } = await supabase.auth.getSession();
    if (process.env.NODE_ENV !== "production") {
      console.debug("[middleware] session present=", !!data.session, "error=", error);
    }
  } catch (e) {
    console.warn("[middleware] supabase session refresh failed", e);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
