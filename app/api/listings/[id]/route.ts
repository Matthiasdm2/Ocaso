// app/api/listings/[id]/route.ts
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: { id: string } };

function mapStatusToDb(frontendStatus: string): string {
  const mapping: Record<string, string> = {
    "active": "actief",
    "paused": "gepauzeerd", 
    "sold": "verkocht",
    "draft": "draft"
  };
  return mapping[frontendStatus] || "actief";
}

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

export async function PUT(req: Request, { params }: Ctx) {
  const supabase = supabaseServer();

  try {
    const body = await req.json();

    // Validate that user owns the listing
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
    }

    // Check ownership
    const { data: existing } = await supabase
      .from("listings")
      .select("seller_id")
      .eq("id", params.id)
      .maybeSingle();

    if (!existing || existing.seller_id !== user.id) {
      return NextResponse.json({ error: "Niet gevonden of geen toegang" }, { status: 404 });
    }

    // Update the listing
    const updateData: {
      title?: string;
      description?: string;
      price?: number;
      state?: string;
      location?: string;
      allowoffers?: boolean;
      images?: string[];
      main_photo?: string | null;
      category_id?: number | null;
      subcategory_id?: number | null;
      status?: string;
    } = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.condition !== undefined) updateData.state = body.condition;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.allow_offers !== undefined) updateData.allowoffers = body.allow_offers;
    if (body.images !== undefined) updateData.images = body.images;
    if (body.main_photo !== undefined) updateData.main_photo = body.main_photo;
    if (body.category_id !== undefined) updateData.category_id = body.category_id;
    if (body.subcategory_id !== undefined) updateData.subcategory_id = body.subcategory_id;
    if (body.status !== undefined) {
      const validStatuses = ["active", "paused", "sold", "draft"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Ongeldige status" }, { status: 400 });
      }
      updateData.status = mapStatusToDb(body.status);
    }

    const { data, error } = await supabase
      .from("listings")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Interne fout" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const supabase = supabaseServer();

  try {
    // Validate that user owns the listing
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
    }

    // Check ownership
    const { data: existing } = await supabase
      .from("listings")
      .select("seller_id")
      .eq("id", params.id)
      .maybeSingle();

    if (!existing || existing.seller_id !== user.id) {
      return NextResponse.json({ error: "Niet gevonden of geen toegang" }, { status: 404 });
    }

    // Delete the listing
    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Interne fout" }, { status: 500 });
  }
}
