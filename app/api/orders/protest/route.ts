export const runtime = "nodejs";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only the buyer may file a protest
  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("id,buyer_id,protest_status")
    .eq("id", orderId)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.buyer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error: updErr } = await supabase
    .from("orders")
    .update({ protest_status: "filed" })
    .eq("id", orderId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
