import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const admin = supabaseAdmin();
        // Haal categorieën op met hun subcategorieën
        const { data, error } = await admin
            .from("categories")
            .select(`
                id,
                name,
                slug,
                sort_order,
                is_active,
                subcategories (
                    id,
                    name,
                    slug,
                    sort_order,
                    is_active,
                    category_id
                )
            `)
            .order("sort_order", { ascending: true })
            .order("sort_order", { ascending: true, foreignTable: "subcategories" });

        if (error) {
            console.error("Error fetching categories:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Transformeer de data naar het formaat dat de frontend verwacht
        const categories = (data || []).map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            sort_order: cat.sort_order || 0,
            is_active: cat.is_active !== false,
            subs: (cat.subcategories || []).map((sub: any) => ({
                id: sub.id,
                name: sub.name,
                slug: sub.slug,
                sort_order: sub.sort_order || 0,
                is_active: sub.is_active !== false,
                category_id: sub.category_id,
            })),
        }));

        return NextResponse.json(categories);
    } catch (error) {
        console.error("Error in GET /api/admin/categories:", error);
        return NextResponse.json({ error: "Interne server fout" }, {
            status: 500,
        });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, slug, sort_order, is_active } = body;

        if (!name || !slug) {
            return NextResponse.json({ error: "Naam en slug zijn verplicht" }, { status: 400 });
        }

        const admin = supabaseAdmin();
        const { data, error } = await admin
            .from("categories")
            .insert({
                name,
                slug,
                sort_order: sort_order || 0,
                is_active: is_active !== false,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating category:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in POST /api/admin/categories:", error);
        return NextResponse.json({ error: "Interne server fout" }, {
            status: 500,
        });
    }
}
