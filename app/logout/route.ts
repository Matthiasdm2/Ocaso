// app/logout/route.ts
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = supabaseServer();
  await supabase.auth.signOut();
  const url = new URL(req.url);
  return NextResponse.redirect(new URL("/login", url.origin), { status: 303 });
}

export async function GET(req: Request) {
  const supabase = supabaseServer();
  await supabase.auth.signOut();
  const url = new URL(req.url);
  return NextResponse.redirect(new URL("/login", url.origin), { status: 303 });
}
