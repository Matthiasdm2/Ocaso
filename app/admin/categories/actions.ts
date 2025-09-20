"use server";
import { supabaseServer } from "@/lib/supabaseServer";

import { assertAdmin } from "../_utils/adminGuard";

export async function importCategoriesCsv(form: FormData) {
  await assertAdmin();
  const file = form.get("file") as File | null;
  if (!file) return { ok: false, error: "Geen CSV ontvangen" };
  const csv = await file.text();

  const rows = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(1) // skip header
    .map((line) => line.split(",").map((s) => s.trim()));

  type Row = { l1n: string; l1s: string; l2n?: string; l2s?: string; l3n?: string; l3s?: string; active?: boolean; order?: number; };
  const parsed: Row[] = rows.map((c) => ({
    l1n: c[0], l1s: c[1],
    l2n: c[2] || undefined, l2s: c[3] || undefined,
    l3n: c[4] || undefined, l3s: c[5] || undefined,
    active: (c[6] || "TRUE").toUpperCase() !== "FALSE",
    order: Number(c[7] || "0") || 0
  }));

  const sb = supabaseServer();

  // 1) upsert L1
  const l1Map = new Map<string, number>();
  const l1Payload = [...new Map(parsed.map(p => [p.l1s, { name: p.l1n, slug: p.l1s, is_active: p.active, sort_order: p.order }])).values()];
  if (l1Payload.length) {
    const { error } = await sb.from("categories").upsert(l1Payload, { onConflict: "slug" });
    if (error) return { ok: false, error: error.message };
    const { data } = await sb.from("categories").select("id,slug").in("slug", l1Payload.map(x=>x.slug));
    data?.forEach((d) => l1Map.set(d.slug, d.id));
  }

  // 2) upsert L2
  const l2Payload: { category_id: number; name: string | undefined; slug: string | undefined; is_active: boolean | undefined; sort_order: number | undefined }[] = [];
  const l2Map = new Map<string, number>(); // key: l2slug
  for (const r of parsed) {
    if (!r.l2s) continue;
    const parent = l1Map.get(r.l1s);
    if (!parent) continue;
    l2Payload.push({ category_id: parent, name: r.l2n, slug: r.l2s, is_active: r.active, sort_order: r.order });
  }
  if (l2Payload.length) {
    const { error } = await sb.from("subcategories").upsert(l2Payload, { onConflict: "slug" });
    if (error) return { ok: false, error: error.message };
    const { data } = await sb.from("subcategories").select("id,slug").in("slug", l2Payload.map(x=>x.slug));
    data?.forEach((d) => l2Map.set(d.slug, d.id));
  }

  // 3) (optioneel) L3 (als je een aparte tabel L3 zou hebben; nu hangen we L3 onder L2 in JSON-model)
  // In jouw huidige DB-structuur hebben we 2 niveaus in tabellen.
  // Advies: bewaar L3 als facetten/filters of als JSON blob aan L2 indien nodig.

  return { ok: true, info: { l1: l1Payload.length, l2: l2Payload.length } };
}

// Small server actions expected by the admin UI. These are minimal implementations
// that perform the requested operations and return a simple { ok, error } shape.
export async function createCategory(form: FormData) {
  await assertAdmin();
  const name = String(form.get("name") || "");
  const slug = String(form.get("slug") || "");
  const sort_order = Number(form.get("sort_order") || 0) || 0;
  const sb = supabaseServer();
  const { error } = await sb.from("categories").insert({ name, slug, sort_order, is_active: true });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function createSubcategory(form: FormData) {
  await assertAdmin();
  const name = String(form.get("name") || "");
  const slug = String(form.get("slug") || "");
  const category_id = Number(form.get("category_id"));
  const sort_order = Number(form.get("sort_order") || 0) || 0;
  const sb = supabaseServer();
  const { error } = await sb.from("subcategories").insert({ name, slug, category_id, sort_order, is_active: true });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function reorderCategory(id: number, sort_order: number) {
  await assertAdmin();
  const sb = supabaseServer();
  const { error } = await sb.from("categories").update({ sort_order }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function reorderSubcategory(id: number, sort_order: number) {
  await assertAdmin();
  const sb = supabaseServer();
  const { error } = await sb.from("subcategories").update({ sort_order }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function toggleCategory(id: number, is_active: boolean) {
  await assertAdmin();
  const sb = supabaseServer();
  const { error } = await sb.from("categories").update({ is_active }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function toggleSubcategory(id: number, is_active: boolean) {
  await assertAdmin();
  const sb = supabaseServer();
  const { error } = await sb.from("subcategories").update({ is_active }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
