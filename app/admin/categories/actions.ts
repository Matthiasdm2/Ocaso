"use server";

import fs from "node:fs";
import path from "node:path";

import { revalidatePath } from "next/cache";

import { supabaseServer } from "@/lib/supabaseServer";

interface CategoryRow {
  id: number;
  slug: string;
}

export async function createCategory(formData: FormData) {
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const sort_order = Number(formData.get("sort_order") || 0);

  const sb = supabaseServer();
  const { error } = await sb
    .from("categories")
    .insert({ name, slug, sort_order, is_active: true });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function createSubcategory(formData: FormData) {
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const sort_order = Number(formData.get("sort_order") || 0);
  const category_id = Number(formData.get("category_id"));

  const sb = supabaseServer();
  const { error } = await sb
    .from("subcategories")
    .insert({ name, slug, sort_order, is_active: true, category_id });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function toggleCategory(id: number, is_active: boolean) {
  const sb = supabaseServer();
  const { error } = await sb
    .from("categories")
    .update({ is_active })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function toggleSubcategory(id: number, is_active: boolean) {
  const sb = supabaseServer();
  const { error } = await sb
    .from("subcategories")
    .update({ is_active })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function reorderCategory(id: number, sort_order: number) {
  const sb = supabaseServer();
  const { error } = await sb
    .from("categories")
    .update({ sort_order })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function reorderSubcategory(id: number, sort_order: number) {
  const sb = supabaseServer();
  const { error } = await sb
    .from("subcategories")
    .update({ sort_order })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function importCategoriesFromJsonAction() {
  "use server";
  try {
    // Import the categories from the JSON file
    const categoriesPath = path.join(process.cwd(), "data", "categories.json");
    const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, "utf-8"));

    const sb = supabaseServer();

    // First, get existing categories
    const { data: existingCats, error: catError } = await sb
      .from("categories")
      .select("id, slug");

    if (catError) {
      throw new Error(catError.message);
    }

    const catMap = new Map((existingCats || []).map((c: CategoryRow) => [c.slug, c.id]));

    // Process L2 subcategories
    const l2Payload = [];

    for (const cat of categoriesData) {
      const catId = catMap.get(cat.slug);
      if (!catId) continue;

      if (cat.subs) {
        for (const [subIndex, sub] of cat.subs.entries()) {
          // Skip L3 for now (only handle direct subcategories)
          if (sub.subs) continue;

          l2Payload.push({
            category_id: catId,
            name: sub.name,
            slug: sub.slug,
            is_active: sub.is_active ?? true,
            sort_order: sub.sort_order ?? subIndex + 1
          });
        }
      }
    }

    // Insert/update L2 subcategories
    if (l2Payload.length) {
      const { error: insertError } = await sb
        .from("subcategories")
        .upsert(l2Payload, { onConflict: "category_id,slug" });

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    revalidatePath("/admin/categories");
  } catch (err) {
    throw new Error(String(err));
  }
}