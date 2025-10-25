import { NextResponse } from "next/server";

import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    env: {
      NODE_ENV: env.NODE_ENV,
      has_SUPABASE_SERVICE_ROLE_KEY: !!env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY_preview: env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...',
    }
  });
}