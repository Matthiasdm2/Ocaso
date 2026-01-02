export const runtime = "nodejs";
// app/api/listings/flags/route.ts
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

function mapStatusToDb(frontendStatus: string): string {
  const mapping: Record<string, string> = {
    "active": "actief",
    "paused": "gepauzeerd", 
    "sold": "verkocht",
    "draft": "draft"
  };
  return mapping[frontendStatus] || "actief";
}

export async function POST(req: Request) {
  const body = await req.json(); // { id, sold?, soldViaOcaso?, status? }
  const { id, sold, soldViaOcaso, status } = body || {};
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = supabaseServer();

  interface Patch {
    sold?: boolean;
    status?: string;
    sold_via_ocaso?: boolean;
    sale_channel?: string | null;
  }
  const patch: Patch = {};
  if (typeof sold === "boolean") {
    patch.sold = sold;
    // Update status based on sold flag, but only if status is not explicitly set
    if (typeof status !== "string") {
      patch.status = sold ? mapStatusToDb("sold") : mapStatusToDb("active");
    }
  }
  if (typeof soldViaOcaso === "boolean") {
    patch.sold_via_ocaso = soldViaOcaso;
    patch.sale_channel = soldViaOcaso ? "ocaso" : null;
  }
  if (typeof status === "string") {
    const validStatuses = ["active", "paused", "sold", "draft"];
    if (validStatuses.includes(status)) {
      patch.status = mapStatusToDb(status);
      // If status is set to sold, also set sold flag
      if (status === "sold" && typeof sold !== "boolean") {
        patch.sold = true;
      } else if (status === "active" && typeof sold !== "boolean") {
        patch.sold = false;
      }
    }
  }

  const { error } = await supabase.from("listings").update(patch).eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
