import fs from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

interface CategoryRow {
  id: number;
  slug: string;
}

export async function POST() {
  try {
    // Import the categories from the JSON file
    const categoriesPath = path.join(process.cwd(), "data", "categories.json");
    const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, "utf-8"));

    const sb = supabaseServiceRole();

    // First, get existing categories
    const { data: existingCats, error: catError } = await sb
      .from("categories")
      .select("id, slug");

    if (catError) {
      return NextResponse.json({ error: catError.message }, { status: 500 });
    }

    const catMap = new Map(
      (existingCats || []).map((c: CategoryRow) => [c.slug, c.id]),
    );

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
            sort_order: sub.sort_order ?? subIndex + 1,
          });
        }
      }
    }

    // Insert/update L2 subcategories
    if (l2Payload.length) {
      const { error } = await sb.from("subcategories").upsert(l2Payload, {
        onConflict: "slug",
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, imported: l2Payload.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
