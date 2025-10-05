import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";

import Avatar from "@/components/Avatar";
import RatingStars from "@/components/RatingStars";
import { supabaseServer } from "@/lib/supabaseServer";

interface PublicProfile {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  isBusiness: boolean;
  joinedISO: string | null;
  rating: number | null;
  reviewsCount: number;
}

async function fetchProfile(id: string): Promise<{ data: PublicProfile | null; error?: Error }> {
  let supabase: SupabaseClient;
  try {
    supabase = supabaseServer() as unknown as SupabaseClient;
  } catch (e) {
    // As fallback we use client (SSR still fine without auth context)
    const mod = await import("@/lib/supabaseClient");
    supabase = mod.createClient() as SupabaseClient;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, is_business, created_at, rating, reviews_count")
    .eq("id", id)
    .maybeSingle();
  if (error) return { data: null, error };
  if (!data) return { data: null };
  const parts = (data.full_name || "").trim().split(" ");
  const profile: PublicProfile = {
    id: data.id,
    fullName: data.full_name || "Onbekende gebruiker",
    firstName: parts[0] || data.full_name || "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
    avatarUrl: data.avatar_url || "/placeholder.png",
    isBusiness: !!data.is_business,
    joinedISO: data.created_at || null,
    rating: typeof data.rating === "number" ? data.rating : null,
    reviewsCount: typeof data.reviews_count === "number" ? data.reviews_count : 0,
  };
  return { data: profile };
}

function formatJoined(iso: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("nl-BE", { year: "numeric", month: "long" });
  } catch {
    return "—";
  }
}

export default async function PublicSellerProfile({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data, error } = await fetchProfile(id);
  if (error) {
    console.error("Profile fetch error", error.message);
  }
  if (!data) return notFound();

  // (Optional) fetch listings by this seller — lightweight subset
  let listings: { id: string; title: string; price: number | string; main_photo: string | null; created_at: string | null }[] = [];
  try {
    let supabase: SupabaseClient;
    try { supabase = supabaseServer() as unknown as SupabaseClient; }
    catch {
      const mod = await import("@/lib/supabaseClient");
      supabase = mod.createClient() as SupabaseClient;
    }
    const { data: ls } = await supabase
      .from("listings")
      .select("id,title,price,main_photo,created_at")
      .eq("author_id", id)
      .order("created_at", { ascending: false })
      .limit(12);
    if (Array.isArray(ls)) listings = ls;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Kon listings niet ophalen voor seller", id, e);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white">
      <header className="relative border-b">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_35%)]" />
        <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex items-center gap-5">
              <Avatar src={data.avatarUrl} name={data.fullName} size={96} rounded="full" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                  <span>{data.fullName}</span>
                  {data.isBusiness && (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium shadow-sm">Bedrijf</span>
                  )}
                </h1>
                <p className="text-sm text-neutral-600 mt-1">Lid sinds {formatJoined(data.joinedISO)}</p>
                <div className="mt-2 flex items-center gap-2 text-sm text-neutral-700">
                  {data.rating != null ? (
                    <span className="inline-flex items-center gap-1">
                      <RatingStars rating={Number(data.rating)} size={14} />
                      <span className="font-medium">{Number(data.rating).toFixed(1)}</span>
                      <span className="text-neutral-500">({data.reviewsCount})</span>
                    </span>
                  ) : (
                    <span className="text-sm text-neutral-500">Nog geen reviews</span>
                  )}
                </div>
              </div>
            </div>
            <div className="md:ml-auto flex gap-2 h-fit">
              <Link href={`/search?author=${id}`} className="inline-flex items-center justify-center rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-800 transition">Alle zoekertjes</Link>
              <Link href={`/messages/new?to=${id}`} className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700 transition">Contacteer</Link>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto max-w-5xl px-4 py-10 space-y-10">
        <section>
          <h2 className="text-lg font-semibold mb-4">Recente zoekertjes</h2>
          {listings.length === 0 ? (
            <p className="text-sm text-neutral-600">Geen zoekertjes gevonden.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => (
                <li key={l.id}>
                  <Link href={`/listings/${l.id}`} className="group block rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-md transition overflow-hidden">
                    <div className="aspect-[4/3] w-full bg-neutral-100 overflow-hidden">
                      {l.main_photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.main_photo} alt={l.title || 'Zoekertje'} className="h-full w-full object-cover group-hover:scale-[1.03] transition" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-400 text-sm">Geen afbeelding</div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <h3 className="text-sm font-medium line-clamp-2">{l.title}</h3>
                      {l.created_at && (
                        <p className="text-[11px] text-neutral-500">{new Date(l.created_at).toLocaleDateString('nl-BE')}</p>
                      )}
                      <p className="text-sm font-semibold text-neutral-900">€ {typeof l.price === 'string' ? l.price : Number(l.price).toFixed(0)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
