// app/api/listings/flags/route.ts
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const body = await req.json(); // { id, sold?, soldViaOcaso? }
  const { id, sold, soldViaOcaso } = body || {};
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = supabaseServer();

  interface Patch {
    is_sold?: boolean;
    status?: string;
    sold_via_ocaso?: boolean;
    sale_channel?: string | null;
  }
  const patch: Patch = {};
  if (typeof sold === "boolean") {
    patch.is_sold = sold;
    patch.status = sold ? "sold" : "active";
  }
  if (typeof soldViaOcaso === "boolean") {
    patch.sold_via_ocaso = soldViaOcaso;
    patch.sale_channel = soldViaOcaso ? "ocaso" : null;
  }

  const { error } = await supabase.from("listings").update(patch).eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
