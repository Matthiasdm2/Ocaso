


"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "../../../lib/supabaseClient";
import { useProfile } from "@/lib/useProfile";

const ListingCardStats = dynamic(() => import("@/components/ListingCardStats"), { ssr: false });

type CardItem = {
  id: string;
  title: string;
  price: number;
  image: string | null;
  created_at: string | null;
  location: string | null;
  views: number;
  favorites: number;
  favorites_count?: number | null;
  href: string;
  description?: string | null;
};

type DBListing = {
  id: string;
  title?: string | null;
  price?: number | string | null;
  images?: unknown;
  main_photo?: string | null;
  created_at?: string | null;
  location?: string | null;
  views?: number | null;
  favorites_count?: number | null;
  description?: string | null;
};

function isDBListing(x: unknown): x is DBListing {
  return typeof x === "object" && x !== null && typeof (x as { id?: unknown }).id === "string";
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-neutral-900">{value}</div>
    </div>
  );
}

function SkeletonCard({ h = 120 }: { h?: number }) {
  return <div className="rounded-2xl border bg-white shadow-sm animate-pulse" style={{ height: h }} />;
}

export default function FavoritesPage() {
  const { profile, loading: profileLoading } = useProfile();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<CardItem[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"new" | "views" | "price-asc" | "price-desc">("new");

  const fetchFavorites = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("listing_id, listings(*)")
        .eq("user_id", profile.id);
      if (error) throw error;
      const raw = (data ?? []) as unknown[];
      const rows: CardItem[] = raw
        .map((r0) => {
          const rec = r0 as Record<string, unknown>;
          const listingsVal = rec["listings"];
          const l = Array.isArray(listingsVal) ? listingsVal[0] : listingsVal;
          if (!isDBListing(l)) return null;
          const images = Array.isArray(l.images) ? (l.images as string[]) : null;
          const image = (images && images.length ? images[0] : l.main_photo) || null;
          return {
            id: l.id,
            title: String(l.title ?? "—"),
            price: Number(l.price ?? 0),
            image,
            created_at: l.created_at ?? null,
            location: l.location ?? null,
            views: Number(l.views ?? 0),
            favorites: Number(l.favorites_count ?? 0),
            favorites_count: typeof l.favorites_count === 'number' ? l.favorites_count : null,
            href: `/listings/${l.id}`,
            description: l.description ?? null,
          } as CardItem;
        })
        .filter(Boolean) as CardItem[];
      setItems(rows);
    } catch (e) {
      setErr("Fout bij ophalen favorieten.");
    } finally {
      setLoading(false);
    }
  }, [profile?.id, supabase]);

  useEffect(() => {
    if (!profileLoading) fetchFavorites();
  }, [fetchFavorites, profileLoading]);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`favorites:user:${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites", filter: `user_id=eq.${profile.id}` }, () => {
        fetchFavorites();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, profile?.id, fetchFavorites]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = items.filter((it) => (q ? it.title.toLowerCase().includes(q) : true));
    switch (sort) {
      case "new":
        rows.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case "views":
        rows.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case "price-asc":
        rows.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "price-desc":
        rows.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
    }
    return rows;
  }, [items, query, sort]);

  const metrics = useMemo(() => {
    const total = items.length;
    const views = items.reduce((acc, it) => acc + (it.views || 0), 0);
    return { total, views };
  }, [items]);

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white">
        <header className="relative border-b">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_35%)]" />
          <div className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Profiel</p>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Mijn favorieten</h1>
              <p className="max-w-2xl text-sm text-neutral-600">Overzicht van je opgeslagen zoekertjes.</p>
            </div>
          </div>
        </header>
        <main className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
          <div className="space-y-6">
            <SkeletonCard h={80} />
            <SkeletonCard h={300} />
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container py-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Mijn favorieten</h1>
        <div className="bg-red-100 border border-red-300 text-red-700 rounded-xl p-4 mb-4">Je bent niet ingelogd.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white">
      <header className="relative border-b">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_35%)]" />
        <div className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Profiel</p>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Mijn favorieten</h1>
            <p className="max-w-2xl text-sm text-neutral-600">Overzicht van je opgeslagen zoekertjes. Realtime bij te houden favorieten en views.</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
        {/* Stats */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Favorieten" value={metrics.total} />
          <StatCard label="Totaal views" value={metrics.views} />
        </section>

        {/* Controls */}
        <section className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
          {err ? (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
          ) : null}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Zoek op titel…"
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-emerald-200"
              >
                <option value="new">Nieuwste eerst</option>
                <option value="views">Meeste bezoekers</option>
                <option value="price-asc">Prijs ↑</option>
                <option value="price-desc">Prijs ↓</option>
              </select>
            </div>
          </div>
        </section>

        {/* List */}
        {items.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-neutral-600 shadow-sm">Geen favorieten gevonden.</div>
        ) : (
          <ul className="space-y-4">
            {filtered.map((item) => (
              <li key={item.id}>
                <article className="card p-6 flex flex-col md:flex-row gap-6 items-center transition hover:shadow-lg border border-gray-200 bg-white rounded-2xl">
                  <div className="aspect-[4/3] w-full max-w-[240px] overflow-hidden rounded-xl bg-neutral-100">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-400">Geen afbeelding</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col gap-2">
                    <Link href={item.href} className="font-semibold text-xl truncate text-primary hover:underline">
                      {item.title}
                    </Link>
                    <div className="text-sm text-gray-600 truncate mb-1">{item.location ?? ""}</div>
                    <div className="text-sm text-gray-500 mb-1">
                      Geplaatst op: {item.created_at ? new Date(item.created_at).toLocaleDateString("nl-BE") : "Onbekend"}
                    </div>
                    <div className="flex gap-2 mb-1">
                      <ListingCardStats id={item.id} initViews={item.views} initFavorites={item.favorites_count ?? item.favorites ?? 0} />
                    </div>
                    <div className="text-base text-gray-700 line-clamp-2">{item.description ?? ""}</div>
                  </div>
                  <div className="shrink-0 text-right flex flex-col gap-2 items-end">
                    <div className="font-bold text-primary text-2xl">€ {item.price}</div>
                    <Link
                      href={item.href}
                      className="mt-2 inline-block rounded-full bg-primary text-white px-5 py-2 text-base font-semibold shadow transition hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      Bekijk
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
