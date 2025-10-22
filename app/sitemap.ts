import { createClient } from "@supabase/supabase-js";
import type { MetadataRoute } from "next";

import type { Database, Tables } from "@/types/supabase";

export const runtime = "nodejs";
export const revalidate = 3600; // 1 uur

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.ocaso.be")
    .replace(/\/$/, "");

  // Static core pages
  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/categories",
    "/explore",
    "/marketplace",
    "/privacy",
    "/terms",
    "/contact",
    "/help",
  ].map((p) => ({
    url: `${base}${p || "/"}`,
    changeFrequency: "daily",
    priority: p === "" ? 1 : 0.7,
  }));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // Env ontbreekt: lever enkel de statische urls
    return staticPages;
  }

  const supabase = createClient<Database>(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: {} },
  });

  // Fetch recent active listings (limit to 1000)
  const { data: listings } = await supabase
    .from("listings")
    .select("id, updated_at, status")
    .order("updated_at", { ascending: false })
    .limit(1000);

  type ListingRow = Pick<Tables<"listings">, "id"> & {
    updated_at?: string | null;
    status?: string | null;
  };
  const listingPages: MetadataRoute.Sitemap =
    (listings as ListingRow[] | null || [])
      .filter((l): l is ListingRow => !!l && typeof l.id === "string")
      .map((l) => ({
        url: `${base}/listings/${l.id}`,
        lastModified: l.updated_at ? new Date(l.updated_at) : undefined,
        changeFrequency: "daily",
        priority: l.status === "actief" ? 0.8 : 0.5,
      }));

  // Fetch shop pages by profiles with a slug
  const { data: shops } = await supabase
    .from("profiles")
    .select("shop_slug, updated_at")
    .not("shop_slug", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1000);

  type ProfileRow = { shop_slug: string | null; updated_at?: string | null };
  const shopPages: MetadataRoute.Sitemap = (shops as ProfileRow[] | null || [])
    .map((p) => (p?.shop_slug ? String(p.shop_slug) : ""))
    .filter((slug) => slug.length > 0)
    .map((slug) => ({
      url: `${base}/shop/${slug}`,
      changeFrequency: "daily",
      priority: 0.6,
    }));

  return [...staticPages, ...listingPages, ...shopPages];
}
