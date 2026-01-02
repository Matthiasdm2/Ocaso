export const runtime = "nodejs";
// app/api/listings/[id]/route.ts
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: { id: string } };

function mapStatusToDb(frontendStatus: string): string {
  const mapping: Record<string, string> = {
    "active": "actief",
    "paused": "gepauzeerd",
    "sold": "verkocht",
    "draft": "draft",
  };
  return mapping[frontendStatus] || "actief";
}

export async function GET(_req: Request, { params }: Ctx) {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }

  // Map database field names to frontend-friendly names
  const mappedData = {
    ...data,
    condition: data.state || data.condition,
    allow_offers: data.allow_offers ?? data.allowoffers ?? true,
    shipping_via_ocaso: data.allow_shipping ?? false,
    dimensions_length: data.shipping_length ?? data.dimensions_length,
    dimensions_width: data.shipping_width ?? data.dimensions_width,
    dimensions_height: data.shipping_height ?? data.dimensions_height,
  };

  // Fetch category and subcategory names if IDs are present
  if (data.category_id) {
    const { data: category } = await supabase
      .from("categories")
      .select("name, slug")
      .eq("id", data.category_id)
      .maybeSingle();
    
    if (category) {
      mappedData.category = category.name;
      mappedData.categorySlug = category.slug;
    }
  }

  if (data.subcategory_id) {
    const { data: subcategory } = await supabase
      .from("subcategories")
      .select("name")
      .eq("id", data.subcategory_id)
      .maybeSingle();
    
    if (subcategory) {
      mappedData.subcategory = subcategory.name;
    }
  }

  return NextResponse.json(mappedData, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request, { params }: Ctx) {
  const supabase = supabaseServer();

  try {
    const body = await req.json();

    // Validate that user owns the listing
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, {
        status: 401,
      });
    }

    // Check ownership
    const { data: existing } = await supabase
      .from("listings")
      .select("seller_id")
      .eq("id", params.id)
      .maybeSingle();

    if (!existing || existing.seller_id !== user.id) {
      return NextResponse.json({ error: "Niet gevonden of geen toegang" }, {
        status: 404,
      });
    }

    // Update the listing
    const updateData: {
      title?: string;
      description?: string;
      price?: number;
      state?: string;
      location?: string;
      allowoffers?: boolean;
      images?: string[];
      main_photo?: string | null;
      category_id?: number | null;
      subcategory_id?: number | null;
      status?: string;
      stock?: number;
      min_bid?: number | null;
      allow_shipping?: boolean;
      shipping_length?: number | null;
      shipping_width?: number | null;
      shipping_height?: number | null;
      shipping_weight?: number | null;
    } = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) {
      updateData.description = body.description;
    }
    if (body.price !== undefined) updateData.price = body.price;
    if (body.condition !== undefined) updateData.state = body.condition;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.allow_offers !== undefined) {
      updateData.allowoffers = body.allow_offers;
    }
    if (body.images !== undefined) updateData.images = body.images;
    if (body.main_photo !== undefined) updateData.main_photo = body.main_photo;
    if (body.category_id !== undefined) {
      updateData.category_id = body.category_id;
    }
    if (body.subcategory_id !== undefined) {
      updateData.subcategory_id = body.subcategory_id;
    }
    if (body.stock !== undefined) updateData.stock = body.stock;
    if (body.min_bid !== undefined) updateData.min_bid = body.min_bid;
    if (body.allow_shipping !== undefined) updateData.allow_shipping = body.allow_shipping;
    // Support both old and new field names for backward compatibility
    if (body.shipping_length !== undefined) updateData.shipping_length = body.shipping_length;
    if (body.shipping_width !== undefined) updateData.shipping_width = body.shipping_width;
    if (body.shipping_height !== undefined) updateData.shipping_height = body.shipping_height;
    if (body.shipping_weight !== undefined) updateData.shipping_weight = body.shipping_weight;
    // Legacy field names
    if (body.dimensions_length !== undefined) updateData.shipping_length = body.dimensions_length;
    if (body.dimensions_width !== undefined) updateData.shipping_width = body.dimensions_width;
    if (body.dimensions_height !== undefined) updateData.shipping_height = body.dimensions_height;
    if (body.shipping_via_ocaso !== undefined) updateData.allow_shipping = body.shipping_via_ocaso;
    if (body.status !== undefined) {
      const validStatuses = ["active", "paused", "sold", "draft"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Ongeldige status" }, {
          status: 400,
        });
      }
      updateData.status = mapStatusToDb(body.status);
    }

    const { data, error } = await supabase
      .from("listings")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Handle vehicle_details update if provided
    if (body.vehicle_details && typeof body.vehicle_details === 'object') {
      const vehicleDetails = body.vehicle_details as Record<string, unknown>;
      
      // Check if this is a vehicle category
      const categoryId = updateData.category_id ?? data?.category_id;
      if (categoryId) {
        const { data: category } = await supabase
          .from("categories")
          .select("slug")
          .eq("id", categoryId)
          .maybeSingle();
        
        const vehicleCategorySlugs = ['auto-motor', 'bedrijfswagens', 'camper-mobilhomes', 'motoren-en-scooters'];
        if (category?.slug && vehicleCategorySlugs.includes(category.slug)) {
          // Check if vehicle details already exist
          const { data: existingVehicleDetails } = await supabase
            .from("listing_vehicle_details")
            .select("id")
            .eq("listing_id", params.id)
            .maybeSingle();
          
          const vehicleData: Record<string, unknown> = {
            listing_id: params.id,
            updated_at: new Date().toISOString(),
          };
          
          // Map vehicle_details fields to database columns
          if (vehicleDetails.year !== undefined) vehicleData.year = vehicleDetails.year;
          if (vehicleDetails.mileage_km !== undefined) vehicleData.mileage_km = vehicleDetails.mileage_km;
          if (vehicleDetails.body_type !== undefined) vehicleData.body_type = vehicleDetails.body_type;
          if (vehicleDetails.condition !== undefined) vehicleData.condition = vehicleDetails.condition;
          if (vehicleDetails.fuel_type !== undefined) vehicleData.fuel_type = vehicleDetails.fuel_type;
          if (vehicleDetails.power_hp !== undefined) vehicleData.power_hp = vehicleDetails.power_hp;
          if (vehicleDetails.transmission !== undefined) vehicleData.transmission = vehicleDetails.transmission;
          
          if (existingVehicleDetails) {
            // Update existing vehicle details
            const { error: vehicleError } = await supabase
              .from("listing_vehicle_details")
              .update(vehicleData)
              .eq("listing_id", params.id);
            
            if (vehicleError) {
              console.error("Error updating vehicle details:", vehicleError);
            }
          } else {
            // Insert new vehicle details
            const { error: vehicleError } = await supabase
              .from("listing_vehicle_details")
              .insert(vehicleData);
            
            if (vehicleError) {
              console.error("Error inserting vehicle details:", vehicleError);
            }
          }
        }
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Interne fout" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const supabase = supabaseServer();

  try {
    // Validate that user owns the listing
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, {
        status: 401,
      });
    }

    // Check ownership
    const { data: existing } = await supabase
      .from("listings")
      .select("seller_id")
      .eq("id", params.id)
      .maybeSingle();

    if (!existing || existing.seller_id !== user.id) {
      return NextResponse.json({ error: "Niet gevonden of geen toegang" }, {
        status: 404,
      });
    }

    // Delete the listing
    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Interne fout" }, { status: 500 });
  }
}
