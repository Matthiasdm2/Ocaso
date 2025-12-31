'use server';

/**
 * Posting Form Server Actions
 *
 * Handles vehicle and non-vehicle listing creation/updates.
 * Integrates with schema-driven validation and vehicle data storage.
 */

import { supabaseServer } from '@/lib/supabaseServer';
import {
  saveVehicleListing,
  validateVehiclePosting,
  type VehiclePostingFormData,
} from '@/lib/vehicle';

/**
 * Create or update a vehicle listing
 * Validates against vehicle schema and saves to Supabase
 */
export async function saveVehicleListingAction(
  formData: VehiclePostingFormData,
  listingId?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  listingId?: string;
  validationErrors?: Record<string, string>;
}> {
  try {
    const supabase = supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to create a listing',
      };
    }

    // Validate vehicle data
    const validationErrors = validateVehiclePosting(
      formData.vehicleType || '',
      formData
    );
    if (validationErrors) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors,
      };
    }

    // Save listing
    const result = await saveVehicleListing(
      user.id,
      formData,
      listingId
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      message: listingId ? 'Listing updated' : 'Listing created',
      listingId: result.listing?.id,
    };
  } catch (error) {
    console.error('Error saving vehicle listing:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Create or update a traditional (non-vehicle) listing
 * Similar structure to vehicle listings but without vehicle schema
 */
export async function saveTraditionalListingAction(formData: {
  title: string;
  description: string;
  price: number;
  condition: string;
  location: string;
  category_id: number;
  images: string[];
  allow_offers?: boolean;
  allow_secure_pay?: boolean;
  allow_shipping?: boolean;
  [key: string]: unknown;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  listingId?: string;
}> {
  try {
    const supabase = supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to create a listing',
      };
    }

    // Validate required fields
    if (!formData.title || !formData.description || formData.price < 0) {
      return {
        success: false,
        error: 'Please fill in all required fields',
      };
    }

    const { data, error } = await supabase
      .from('listings')
      .insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        price: formData.price,
        location: formData.location,
        category_id: formData.category_id,
        images: formData.images,
        condition: formData.condition,
        allow_offers: formData.allow_offers ?? true,
        allow_secure_pay: formData.allow_secure_pay ?? false,
        allow_shipping: formData.allow_shipping ?? false,
        status: 'draft',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating listing:', error);
      return {
        success: false,
        error: error.message || 'Failed to create listing',
      };
    }

    return {
      success: true,
      message: 'Listing created',
      listingId: data?.id,
    };
  } catch (error) {
    console.error('Unexpected error creating listing:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}
