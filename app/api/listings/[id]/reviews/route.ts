export const runtime = "nodejs";
/* eslint-disable simple-import-sort/imports */
import { getServerUser } from "@/lib/getServerUser";
import { supabaseServer } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ProfileLite { full_name?: string | null; avatar_url?: string | null }
interface ReviewRow { id: string; rating?: number; comment?: string; created_at?: string; reviewer?: ProfileLite | ProfileLite[] | null }
function extractReviewer(rev: ReviewRow) { const r = rev.reviewer; return Array.isArray(r) ? (r[0] || {}) : (r || {}); }

// Fallback dynamic route (POST) to maintain old frontend path if still used
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { user } = await getServerUser(req);
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { id: listingId } = params;
  let body: { rating?: number; comment?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 }); }
  const r = Number(body.rating);
  const c = (body.comment || "").trim();
  if (!Number.isFinite(r) || r < 1 || r > 5) return NextResponse.json({ error: "Rating 1-5" }, { status: 400 });
  if (!c) return NextResponse.json({ error: "Comment verplicht" }, { status: 400 });
  const { data: inserted, error: insertErr } = await supabase
    .from("reviews")
    .insert({ listing_id: listingId, rating: r, comment: c, author_id: user.id })
    .select("id,rating,comment,created_at,reviewer:profiles!reviews_author_id_fkey(full_name,avatar_url)")
    .maybeSingle();

  if (insertErr || !inserted) {
    interface PgErr { code?: string; details?: unknown; hint?: string; message?: string }
    const pg: PgErr = insertErr || {};
    const code = pg.code;
    let msg = "Kon review niet opslaan";
    if (code === '23505') msg = "Je hebt al een review geplaatst.";
    else if (code === '42501') msg = "Geen permissie (RLS policy blokkeert).";
    else if (code === '23503') msg = "Ongeldige verwijzing (listing bestaat niet?).";
    if (process.env.NODE_ENV !== 'production') {
      console.error('[listing review POST] insert error', insertErr);
  return NextResponse.json({ error: msg, _debug: { code, details: pg.details, hint: pg.hint, message: pg.message } }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  const row = inserted as ReviewRow;
  const pr = extractReviewer(row);
  return NextResponse.json({
    id: row.id,
    rating: row.rating ?? r,
    comment: row.comment ?? c,
    created_at: row.created_at || new Date().toISOString(),
    reviewer: pr.full_name || "Gebruiker",
    reviewerAvatar: pr.avatar_url || null,
  }, { status: 201 });
}
