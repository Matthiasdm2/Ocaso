import { type NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type CategoryWithSubs = {
    id: number;
    name: string;
    subcategories: {
        id: number;
        name: string;
    }[];
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const supabase = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "31d";

    // Bereken de startdatum gebaseerd op de periode
    const now = new Date();
    let startDate: Date;

    switch (period) {
        case "7d":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case "31d":
            startDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
            break;
        case "1y":
            startDate = new Date(
                now.getFullYear() - 1,
                now.getMonth(),
                now.getDate(),
            );
            break;
        case "all":
        default:
            startDate = new Date(0); // Vanaf het begin
            break;
    }

    try {
        // Haal categorieën op met hun subcategorieën
        const { data: categories, error: catError } = await supabase
            .from("categories")
            .select(`
        id,
        name,
        subcategories (
          id,
          name
        )
      `)
            .order("name");

        if (catError) throw catError;

        // Voor elke categorie, tel het aantal listings in de periode
        const categoryStats = await Promise.all(
            categories.map(async (category: CategoryWithSubs) => {
                // Tel listings voor deze hoofdcategorie (alle listings met deze category_id)
                const { count: mainCount } = await supabase
                    .from("listings")
                    .select("*", { count: "exact", head: true })
                    .eq("category_id", category.id)
                    .gte("created_at", startDate.toISOString());

                // Tel listings voor subcategorieën (listings met deze specifieke subcategory_id)
                const subcategoryStats = await Promise.all(
                    category.subcategories.map(async (sub) => {
                        const { count: subCount } = await supabase
                            .from("listings")
                            .select("*", { count: "exact", head: true })
                            .eq("subcategory_id", sub.id)
                            .gte("created_at", startDate.toISOString());

                        return {
                            name: sub.name,
                            count: subCount || 0,
                        };
                    }),
                );

                // Filter alleen subcategorieën met listings > 0
                const filteredSubcategories = subcategoryStats.filter((sub) =>
                    sub.count > 0
                );

                return {
                    name: category.name,
                    count: mainCount || 0,
                    subcategories: filteredSubcategories || [],
                };
            }),
        );

        // Filter alleen categorieën met listings > 0
        const filteredCategoryStats = categoryStats.filter((cat) =>
            cat.count > 0
        );

        // Sorteer op aantal listings (hoogste eerst)
        filteredCategoryStats.sort((a, b) => b.count - a.count);

        // Controleer of de som van categorieën gelijk is aan totaal listings
        const totalFromCategories = filteredCategoryStats.reduce(
            (sum, cat) => sum + cat.count,
            0,
        );
        const { count: actualTotal } = await supabase
            .from("listings")
            .select("*", { count: "exact", head: true })
            .gte("created_at", startDate.toISOString());

        console.log(
            `Category stats check: Sum of categories = ${totalFromCategories}, Actual total = ${actualTotal}`,
        );

        return NextResponse.json(filteredCategoryStats);
    } catch (error) {
        console.error("Error fetching category stats:", error);
        return NextResponse.json({ error: "Failed to fetch category stats" }, {
            status: 500,
        });
    }
}
