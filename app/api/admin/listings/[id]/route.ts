import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PUT(
    req: Request,
    { params }: { params: { id: string } },
) {
    try {
        const formData = await req.formData();

        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const price = parseFloat(formData.get("price") as string);
        const category_id = parseInt(formData.get("category_id") as string);
        const subcategory_id = formData.get("subcategory_id") ? parseInt(formData.get("subcategory_id") as string) : null;
        const state = formData.get("state") as string;
        const location = formData.get("location") as string || null;
        const status = formData.get("status") as string;

        // Valideer verplichte velden
        if (!title || !description || !price || !category_id || !status) {
            return NextResponse.json(
                { error: "Ontbrekende verplichte velden" },
                { status: 400 },
            );
        }

        // Update listing
        const admin = supabaseAdmin();
        const { data: listing, error: listingError } = await admin
            .from("listings")
            .update({
                title,
                description,
                price,
                category_id,
                subcategory_id,
                state: state,
                location,
                status,
            })
            .eq("id", params.id)
            .select()
            .single();

        if (listingError) {
            console.error("Error updating listing:", listingError);
            return NextResponse.json({
                error: "Fout bij het bijwerken van listing",
            }, { status: 500 });
        }

        // Verwerk nieuwe afbeeldingen indien aanwezig
        const images = formData.getAll("images") as File[];
        if (images.length > 0) {
            for (const image of images) {
                if (image.size > 10 * 1024 * 1024) { // 10MB limit
                    continue; // Sla grote bestanden over
                }

                const fileExt = image.name.split(".").pop();
                const fileName = `${params.id}/${Date.now()}.${fileExt}`;

                // Upload naar Supabase Storage
                const { error: uploadError } = await admin.storage
                    .from("listing-images")
                    .upload(fileName, image);

                if (!uploadError) {
                    // Voeg image URL toe aan listing_images tabel
                    const { data: publicUrl } = admin.storage
                        .from("listing-images")
                        .getPublicUrl(fileName);

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (admin as any)
                        .from("listing_images")
                        .insert({
                            listing_id: params.id,
                            image_url: publicUrl.publicUrl,
                            is_primary: false,
                        });
                }
            }
        }

        return NextResponse.json({
            message: "Listing succesvol bijgewerkt",
            listing,
        });
    } catch (error) {
        console.error("Error in PUT /api/admin/listings/[id]:", error);
        return NextResponse.json({ error: "Interne server fout" }, {
            status: 500,
        });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } },
) {
    try {
        const admin = supabaseAdmin();
        const { error } = await admin
            .from("listings")
            .delete()
            .eq("id", params.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in DELETE /api/admin/listings/[id]:", error);
        return NextResponse.json({ error: "Interne server fout" }, { status: 500 });
    }
}
