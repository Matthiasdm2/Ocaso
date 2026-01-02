export const runtime = "nodejs";
/* eslint-disable simple-import-sort/imports */
import { getServerUser } from "@/lib/getServerUser";
import { supabaseServer } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

// Ensure this route is always dynamic so auth cookies are read fresh
export const dynamic = "force-dynamic";

// POST /api/business/:id/reviews
// Body: { rating: number 1-5, comment: string }
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = supabaseServer();
  const { id: businessId } = params;
  const { user } = await getServerUser(req);
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: { rating?: number; comment?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const rating = Number(body.rating);
  const comment = (body.comment || "").trim();
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating moet tussen 1 en 5 zijn" }, {
      status: 400,
    });
  }
  if (!comment) {
    return NextResponse.json({ error: "Comment is verplicht" }, {
      status: 400,
    });
  }

  // Insert review
  const { data: inserted, error: insertErr } = await supabase
    .from("reviews")
    .insert({ business_id: businessId, rating, comment, author_id: user.id } as never)
    .select(
      "id,rating,comment,created_at,author:profiles!reviews_author_id_fkey(display_name,avatar_url)",
    )
    .maybeSingle();

  if (insertErr || !inserted) {
    interface PgErr {
      code?: string;
      details?: unknown;
      hint?: string;
      message?: string;
    }
    const pg: PgErr = insertErr || {};
    let msg = "Kon review niet opslaan";
    if (pg.code === "23505") msg = "Je hebt al een review geplaatst."; // duplicate key
    else if (pg.code === "42501") msg = "Geen permissie (RLS policy).";
    else if (pg.code === "23503") {
      msg = "Ongeldige verwijzing (business bestaat niet?).";
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("[business review POST] insert error", pg);
      return NextResponse.json({
        error: msg,
        _debug: {
          code: pg.code,
          details: pg.details,
          hint: pg.hint,
          message: pg.message,
        },
      }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Recalculate aggregates
  const { data: allRatings, error: aggErr } = await supabase
    .from("reviews")
    .select("rating", { count: "exact" })
    .eq("business_id", businessId);

  let ratingAvg = rating;
  let reviewCount = 1;
  if (!aggErr && allRatings) {
    interface Row {
      rating?: number;
    }
    const ratingsArray = (allRatings as Row[]).map((r) =>
      Number(r.rating) || 0
    );
    reviewCount = ratingsArray.length;
    if (ratingsArray.length) {
      ratingAvg = ratingsArray.reduce((a, b) => a + b, 0) / ratingsArray.length;
    }
  }

  // Update alleen kolommen die bestaan in profiles, om 42703 te vermijden
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", businessId)
      .maybeSingle();
    if (prof) {
      const payload: Record<string, number> = {};
      if (Object.prototype.hasOwnProperty.call(prof, "rating")) {
        payload.rating = ratingAvg;
      }
      if (Object.prototype.hasOwnProperty.call(prof, "avg_rating")) {
        payload.avg_rating = ratingAvg;
      }
      if (Object.prototype.hasOwnProperty.call(prof, "review_count")) {
        payload.review_count = reviewCount;
      }
      if (Object.prototype.hasOwnProperty.call(prof, "reviews")) {
        payload.reviews = reviewCount;
      }
      if (Object.keys(payload).length) {
        await supabase.from("profiles").update(payload as never).eq("id", businessId);
      }
    }
  } catch (e) {
    console.warn("[business reviews] kon aggregates niet updaten", e);
  }

  const response = {
    id: inserted.id,
    rating: inserted.rating,
    comment: inserted.comment,
    date: inserted.created_at,
    author: (() => {
      const rawAuthor: unknown =
        (inserted as unknown as { author?: unknown }).author;
      if (Array.isArray(rawAuthor)) {
        const first = rawAuthor[0] as { display_name?: string } | undefined;
        return first?.display_name || null;
      }
      if (rawAuthor && typeof rawAuthor === "object") {
        return (rawAuthor as { display_name?: string }).display_name || null;
      }
      return null;
    })(),
    authorAvatar: (() => {
      const rawAuthor: unknown =
        (inserted as unknown as { author?: unknown }).author;
      if (Array.isArray(rawAuthor)) {
        const first = rawAuthor[0] as { avatar_url?: string } | undefined;
        return first?.avatar_url || null;
      }
      if (rawAuthor && typeof rawAuthor === "object") {
        return (rawAuthor as { avatar_url?: string }).avatar_url || null;
      }
      return null;
    })(),
    ratingAvg,
    reviewCount,
  };

  return NextResponse.json(response, { status: 201 });
}

// (optioneel) GET lijst van reviews voor business (limiet basis)
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = supabaseServer();
  const { id: businessId } = params;
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id,rating,comment,created_at,author:profiles!reviews_author_id_fkey(display_name,avatar_url)",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[GET /business/:id/reviews] error", error);
    return NextResponse.json({ error: "Kon reviews niet laden" }, {
      status: 500,
    });
  }
  interface ReviewRow {
    id: number;
    rating: number;
    comment: string;
    created_at: string;
    author?: unknown;
  }
  const items = (data as ReviewRow[] | null | undefined || []).map(
    (r: ReviewRow) => {
      const rawAuthor: unknown = (r as unknown as { author?: unknown }).author;
      let display: string | null = null;
      let avatar: string | null = null;
      if (Array.isArray(rawAuthor)) {
        const first = rawAuthor[0] as {
          display_name?: string;
          avatar_url?: string;
        } | undefined;
        display = first?.display_name || null;
        avatar = first?.avatar_url || null;
      } else if (rawAuthor && typeof rawAuthor === "object") {
        display = (rawAuthor as { display_name?: string }).display_name || null;
        avatar = (rawAuthor as { avatar_url?: string }).avatar_url || null;
      }
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        date: r.created_at,
        author: display,
        authorAvatar: avatar,
      };
    },
  );
  return NextResponse.json({ items });
}
