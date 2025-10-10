import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET() {
    const supabase = supabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (!profile?.is_admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
        .from("listings")
        .select(`
      id, 
      title, 
      description, 
      price, 
      category_id, 
      subcategory_id, 
      state, 
      location, 
      status,
      images
    `)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
}

export async function POST(req: Request) {
    const supabase = supabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (!profile?.is_admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const formData = await req.formData();

        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const price = parseFloat(formData.get("price") as string);
        const category_id = formData.get("category_id") as string;
        const subcategory_id = formData.get("subcategory_id") as string || null;
        const state = formData.get("state") as string;
        const location = formData.get("location") as string || null;

        // Valideer verplichte velden
        if (!title || !description || !price || !category_id) {
            return NextResponse.json(
                { error: "Ontbrekende verplichte velden" },
                { status: 400 },
            );
        }

        // Voeg listing toe
        const { data: listing, error: listingError } = await supabase
            .from("listings")
            .insert({
                title,
                description,
                price,
                category_id,
                subcategory_id,
                state: state,
                location,
                seller_id: user.id, // Admin wordt de verkoper
                status: "actief",
            })
            .select()
            .single();

        if (listingError) {
            console.error("Error creating listing:", listingError);
            return NextResponse.json({
                error: "Fout bij het toevoegen van listing",
            }, { status: 500 });
        }

        // Verwerk afbeeldingen indien aanwezig
        const images = formData.getAll("images") as File[];
        if (images.length > 0) {
            for (const image of images) {
                if (image.size > 10 * 1024 * 1024) { // 10MB limit
                    continue; // Sla grote bestanden over
                }

                const fileExt = image.name.split(".").pop();
                const fileName = `${listing.id}/${Date.now()}.${fileExt}`;

                // Upload naar Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from("listing-images")
                    .upload(fileName, image);

                if (!uploadError) {
                    // Voeg image URL toe aan listing_images tabel
                    const { data: publicUrl } = supabase.storage
                        .from("listing-images")
                        .getPublicUrl(fileName);

                    await supabase
                        .from("listing_images")
                        .insert({
                            listing_id: listing.id,
                            image_url: publicUrl.publicUrl,
                            is_primary: false, // Eerste image wordt primary gemaakt
                        });
                }
            }

            // Maak eerste image primary
            const { data: firstImage } = await supabase
                .from("listing_images")
                .select("id")
                .eq("listing_id", listing.id)
                .limit(1)
                .single();

            if (firstImage) {
                await supabase
                    .from("listing_images")
                    .update({ is_primary: true })
                    .eq("id", firstImage.id);
            }
        }

        return NextResponse.json({
            message: "Listing succesvol toegevoegd",
            listing,
        });
    } catch (error) {
        console.error("Error in POST /api/admin/listings:", error);
        return NextResponse.json({ error: "Interne server fout" }, {
            status: 500,
        });
    }
}
