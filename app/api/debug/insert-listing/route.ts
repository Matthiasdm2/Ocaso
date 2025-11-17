/* eslint-disable simple-import-sort/imports */
import { NextResponse } from "next/server";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

// Development-only debug endpoint to try inserting a listing using the service role key.
// This helps reproduce insertion errors (RLS, missing columns, etc.) — do not enable in production.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, price, seller_id } = body;
    if (!title || !price || !seller_id) {
      return NextResponse.json({ error: "Missing title, price or seller_id" }, { status: 400 });
    }

    const supabase = supabaseServiceRole();
  const payload: { title: string; price: number; seller_id: string; status?: string; images?: string[] } = {
      title: String(title).trim(),
      price: Number(price),
      seller_id: seller_id,
      status: "actief",
      images: body.images || [],
  };
  // Remove any cast; payload already typed
    const res = await supabase.from("listings").insert([payload]).select("id").maybeSingle();
    if (res.error) {
      console.error("[debug insert-listing] error:", res.error);
      return NextResponse.json({ error: res.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, id: res.data?.id }, { status: 200 });
  } catch (e) {
    console.error("[debug insert-listing] unexpected error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
