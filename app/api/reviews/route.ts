/* eslint-disable simple-import-sort/imports */
import { getServerUser } from "@/lib/getServerUser";
import { supabaseServer } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ProfileLite { full_name?: string | null; avatar_url?: string | null }
interface ReviewRow {
  id: string;
  rating?: number;
  comment?: string;
  created_at?: string;
  reviewer?: ProfileLite | ProfileLite[] | null;
}
function extractReviewer(rev: ReviewRow) {
  const r = rev.reviewer;
  if (Array.isArray(r)) return r[0] || {};
  return r || {};
}

// GET /api/reviews?listing_id=... | business_id=... | (both -> combined)
export async function GET(req: Request) {
  const supabase = supabaseServer();
  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listing_id");
  const businessId = searchParams.get("business_id");
  if (!listingId && !businessId) return NextResponse.json({ items: [] });

  async function fetchSet(filter: { listing_id?: string; business_id?: string }) {
    let q = supabase
      .from("reviews")
      .select("id,rating,comment,created_at,reviewer:profiles!reviews_author_id_fkey(full_name,avatar_url)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter.listing_id) q = q.eq("listing_id", filter.listing_id);
    if (filter.business_id) q = q.eq("business_id", filter.business_id);
    return q; // returns query builder
  }

  const results: ReviewRow[] = [];
  try {
    if (listingId) {
      const { data, error } = await fetchSet({ listing_id: listingId });
      if (error) throw error;
      if (data) results.push(...(data as ReviewRow[]));
    }
    if (businessId) {
      const { data, error } = await fetchSet({ business_id: businessId });
      if (error) throw error;
      if (data) results.push(...(data as ReviewRow[]));
    }
  } catch (error) {
    console.error("[GET /api/reviews]", error);
    return NextResponse.json({ error: "Kon reviews niet laden", items: [] }, { status: 500 });
  }
  // Deduplicate by id
  const seen = new Set<string>();
  const items = results.filter(r => {
    if (!r.id || seen.has(r.id)) return false; seen.add(r.id); return true;
  }).map(r => {
    const pr = extractReviewer(r);
    return {
      id: r.id,
      rating: r.rating ?? 0,
      comment: r.comment ?? "",
      created_at: r.created_at || new Date().toISOString(),
      reviewer: pr.full_name || "Gebruiker",
      reviewerAvatar: pr.avatar_url || null,
    };
  });
  return NextResponse.json({ items });
}

// POST /api/reviews  Body: { listing_id, rating, comment }
export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { user } = await getServerUser(req);
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  let body: { listing_id?: string; business_id?: string; rating?: number; comment?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 }); }
  const { listing_id, business_id, rating, comment } = body;
  if (!listing_id && !business_id) return NextResponse.json({ error: "listing_id of business_id verplicht" }, { status: 400 });
  const r = Number(rating);
  const c = (comment || "").trim();
  if (!Number.isFinite(r) || r < 1 || r > 5) return NextResponse.json({ error: "Rating 1-5" }, { status: 400 });
  if (!c) return NextResponse.json({ error: "Comment verplicht" }, { status: 400 });

  const insertData: { rating: number; comment: string; author_id: string; listing_id?: string; business_id?: string } = {
    rating: r,
    comment: c,
    author_id: user.id
  };
  if (listing_id) insertData.listing_id = listing_id;
  if (business_id) insertData.business_id = business_id;

  // Eerst proberen te inserten; bij unieke constraint fout proberen we een update (een gebruiker mag zijn bestaande review bijwerken)
  let inserted: ReviewRow | null = null;
  let insErr: { code?: string; message?: string } | null = null;
  try {
    const { data, error } = await supabase
      .from("reviews")
      .insert(insertData)
      .select("id,rating,comment,created_at,reviewer:profiles!reviews_author_id_fkey(full_name,avatar_url)")
      .maybeSingle();
    inserted = data as ReviewRow | null;
    if (error) {
      const errObj = error as unknown as { code?: string; message?: string };
      insErr = { code: errObj.code, message: errObj.message };
    }
  } catch (e) {
    insErr = { code: (e as { code?: string }).code, message: (e as { message?: string }).message };
  }
  // Duplicate? (Postgres unique violation code 23505) of melding bevat 'duplicate key'
  if (insErr && (insErr.code === '23505' || /duplicate key/i.test(insErr.message || ''))) {
    // Zoek bestaande review van deze gebruiker voor dezelfde listing of business
    const matchFilter = listing_id ? { listing_id, author_id: user.id } : { business_id, author_id: user.id };
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .match(matchFilter)
      .maybeSingle();
    if (existing?.id) {
      const { data: updated, error: updErr } = await supabase
        .from('reviews')
        .update({ rating: r, comment: c })
        .eq('id', existing.id)
        .select("id,rating,comment,created_at,reviewer:profiles!reviews_author_id_fkey(full_name,avatar_url)")
        .maybeSingle();
      if (updErr || !updated) {
        console.error('[POST /api/reviews] Update after duplicate error', updErr);
        return NextResponse.json({ error: 'Kon bestaande review niet bijwerken' }, { status: 500 });
      }
  inserted = updated as ReviewRow;
      insErr = null;
    }
  }
  if (insErr || !inserted) {
    console.error("[POST /api/reviews] Insert error (final):", insErr);
    console.error("[POST /api/reviews] User ID:", user.id);
    console.error("[POST /api/reviews] Listing ID:", listing_id);
    console.error("[POST /api/reviews] Business ID:", business_id);
    console.error("[POST /api/reviews] Rating:", r, "Comment:", c);
    return NextResponse.json({ error: `Kon review niet opslaan: ${insErr?.message || 'Onbekende fout'}` }, { status: 500 });
  }
  const row = inserted as ReviewRow;
  const pr = extractReviewer(row);
  const createdAt = row.created_at || new Date().toISOString();
  const item = {
    // Gestandaardiseerd response object zodat frontend direct kan tonen
    id: row.id,
    rating: row.rating ?? r,
    comment: row.comment ?? c,
    date: createdAt,              // alias voor created_at
    created_at: createdAt,        // backward compat
    author: pr.full_name || "Gebruiker",
    authorAvatar: pr.avatar_url || null,
    reviewer: pr.full_name || "Gebruiker",       // backward compat (oude naam)
    reviewerAvatar: pr.avatar_url || null         // backward compat
  };
  console.log('[POST /api/reviews] OK new review', { id: item.id, rating: item.rating, hasComment: !!item.comment });
  return NextResponse.json(item, { status: 201 });
}
