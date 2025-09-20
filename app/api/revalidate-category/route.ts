// app/api/revalidate-category/route.ts
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { category, subcategory } = await req.json();

    if (!category || typeof category !== "string") {
      return NextResponse.json({ ok: false, error: "category required" }, { status: 400 });
    }
    revalidateTag(`category:${category}`);
    if (subcategory && typeof subcategory === "string" && subcategory.length > 0) {
      revalidateTag(`category:${category}:${subcategory}`);
    }
    revalidateTag("categories"); // bv. categorie-beheer/overzicht

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

