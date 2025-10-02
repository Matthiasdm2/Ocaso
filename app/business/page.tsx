import { supabaseServer } from "@/lib/supabaseServer";

import BusinessListClient from "./BusinessListClient";

export const dynamic = 'force-dynamic';

type CategorySidebarCategory = {
  id: number;
  name: string;
  slug: string;
  subcategories: { id: number; name: string; slug: string }[];
};

async function getCategories(): Promise<CategorySidebarCategory[]> {
  const supabase = supabaseServer();

  // Probeer eerst relationele structuur (categories + subcategories)
  const { data: categoriesDataRel, error: categoriesRelError } = await supabase
    .from("categories")
    .select("id, name, slug, sort_order, is_active, subcategories(id, name, slug, sort_order, is_active)")
    .order("sort_order", { ascending: true });

  interface FlatCategoryRow { id: number; name: string; slug: string; parent_id?: number | null; sort_order?: number | null; is_active?: boolean | null; subcategories?: FlatCategoryRow[]; }
  let categoriesData = categoriesDataRel as FlatCategoryRow[] | null;

  // Fallback: single table met parent_id
  if (categoriesRelError || !categoriesDataRel || categoriesDataRel.every((c: FlatCategoryRow) => !c.subcategories?.length)) {
    const { data: flatData } = await supabase
      .from("categories")
      .select("id, name, slug, parent_id, sort_order, is_active")
      .order("sort_order", { ascending: true });
    if (flatData) {
      const parents = flatData.filter((r: FlatCategoryRow) => !r.parent_id);
      const byParent: Record<number, FlatCategoryRow[]> = {};
      for (const row of flatData as FlatCategoryRow[]) {
        if (row.parent_id) {
          byParent[row.parent_id] = byParent[row.parent_id] || [];
          byParent[row.parent_id].push(row);
        }
      }
      categoriesData = parents.map((p: FlatCategoryRow) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sort_order: p.sort_order ?? null,
        is_active: p.is_active ?? null,
        subcategories: (byParent[p.id] || []).map((s: FlatCategoryRow) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          sort_order: s.sort_order ?? null,
          is_active: s.is_active ?? null,
        })),
      }));
    }
  }

  type SupabaseCategory = {
    id: number;
    name: string;
    slug: string;
    sort_order?: number;
    is_active?: boolean;
    subcategories?: { id: number; name: string; slug: string; sort_order?: number; is_active?: boolean }[];
  };

  const categories: CategorySidebarCategory[] = ((categoriesData ?? []) as SupabaseCategory[]).map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    subcategories: Array.isArray(cat.subcategories)
      ? (cat.subcategories as { id: number; name: string; slug: string; sort_order?: number; is_active?: boolean }[])
          .filter((s) => s?.is_active !== false)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((sub) => ({
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
          }))
      : [],
  }));

  return categories;
}

export default async function BusinessListPage() {
  const categories = await getCategories();

  return <BusinessListClient categories={categories} />;
}
