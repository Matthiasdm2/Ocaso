// app/api/listings/[id]/route.ts
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
