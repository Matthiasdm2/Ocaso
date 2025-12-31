/**
 * CANONICAL CATEGORY SERVICE
 * 
 * Single source of truth for all category operations.
 * Replaces hardcoded lib/categories.ts with Supabase data.
 * 
 * Features:
 * - getCategoriesWithSubcategories() - Main UI function
 * - getVehicleBrandsByCategorySlug() - For vehicle filtering
 * - Client-side caching with TTL
 * - Error handling and fallbacks
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@/lib/supabaseClient';

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  subcategories: SubCategory[];
};

export type SubCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  category_id: string;
};

export type VehicleBrand = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

/**
 * Cache with TTL
 */
const categoryCache = new Map<string, { data: any; time: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all categories with their subcategories
 * This is the main function to replace hardcoded CATEGORIES
 */
export async function getCategoriesWithSubcategories(): Promise<Category[]> {
  const cacheKey = 'categories_with_subcategories';
  const cached = categoryCache.get(cacheKey);
  
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  try {
    const supabase = createClient();
    
    // Using the view created in migrations for optimized query
    const { data, error } = await supabase
      .from('categories_with_subcategories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Failed to fetch categories with subcategories:', error);
      return [];
    }

    const categories: Category[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      icon_url: row.icon_url,
      is_active: row.is_active,
      sort_order: row.sort_order,
      created_at: row.created_at,
      subcategories: row.subcategories || [],
    }));

    // Cache the result
    categoryCache.set(cacheKey, {
      data: categories,
      time: Date.now(),
    });

    return categories;

  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Get categories only (without subcategories)
 * Useful for simple category lists
 */
export async function getCategories(): Promise<Omit<Category, 'subcategories'>[]> {
  const cacheKey = 'categories_only';
  const cached = categoryCache.get(cacheKey);
  
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('categories')
      .select('id,name,slug,icon_url,is_active,sort_order,created_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Failed to fetch categories:', error);
      return [];
    }

    const categories = data || [];

    // Cache the result
    categoryCache.set(cacheKey, {
      data: categories,
      time: Date.now(),
    });

    return categories;

  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Get vehicle brands for a specific category
 * Used for marketplace filters and sell page
 */
export async function getVehicleBrandsByCategorySlug(categorySlug: string): Promise<VehicleBrand[]> {
  const cacheKey = `vehicle_brands_${categorySlug}`;
  const cached = categoryCache.get(cacheKey);
  
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  try {
    const supabase = createClient();
    
    // Using the function created in migrations
    const { data, error } = await supabase
      .rpc('get_vehicle_brands_by_category', { category_slug: categorySlug });

    if (error) {
      console.error(`Failed to fetch vehicle brands for category '${categorySlug}':`, error);
      return [];
    }

    const brands: VehicleBrand[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      sort_order: row.sort_order,
    }));

    // Cache the result
    categoryCache.set(cacheKey, {
      data: brands,
      time: Date.now(),
    });

    return brands;

  } catch (error) {
    console.error(`Error fetching vehicle brands for category '${categorySlug}':`, error);
    return [];
  }
}

/**
 * Check if a category is vehicle-related (has brands)
 */
export function isVehicleCategory(categorySlug: string): boolean {
  const vehicleSlugs = ['autos', 'motos', 'bedrijfsvoertuigen', 'campers'];
  return vehicleSlugs.includes(categorySlug);
}

/**
 * Find category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategoriesWithSubcategories();
  return categories.find(cat => cat.slug === slug) || null;
}

/**
 * Find subcategory by slug within a category
 */
export async function getSubcategoryBySlug(categorySlug: string, subSlug: string): Promise<SubCategory | null> {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return null;
  
  return category.subcategories.find(sub => sub.slug === subSlug) || null;
}

/**
 * Get category hierarchy (category + subcategory) by slugs
 */
export async function getCategoryHierarchy(categorySlug: string, subSlug?: string) {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return null;

  const result = {
    category,
    subcategory: null as SubCategory | null,
    vehicleBrands: [] as VehicleBrand[],
  };

  if (subSlug) {
    result.subcategory = category.subcategories.find(sub => sub.slug === subSlug) || null;
  }

  // Load vehicle brands if this is a vehicle category
  if (isVehicleCategory(categorySlug)) {
    result.vehicleBrands = await getVehicleBrandsByCategorySlug(categorySlug);
  }

  return result;
}

/**
 * Clear cache for specific key or all caches
 */
export function clearCategoryCache(key?: string): void {
  if (key) {
    categoryCache.delete(key);
  } else {
    categoryCache.clear();
  }
}

/**
 * Preload categories for better performance
 */
export async function preloadCategories(): Promise<void> {
  try {
    await getCategoriesWithSubcategories();
    console.log('Categories preloaded successfully');
  } catch (error) {
    console.error('Failed to preload categories:', error);
  }
}
