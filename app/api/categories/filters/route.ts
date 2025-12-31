import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category');
    
    if (!categorySlug) {
      return NextResponse.json(
        { error: 'Category slug is required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get category filters for this category
    const { data: filters, error } = await supabase
      .from('category_filters')
      .select('*')
      .eq('category_slug', categorySlug)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching category filters:', error);
      return NextResponse.json(
        { error: 'Failed to fetch category filters' },
        { status: 500 }
      );
    }

    // For now, return the basic filters without dynamic range calculation
    // The dynamic ranges can be implemented later when the listings have the proper columns
    const enhancedFilters = filters.map((filter) => {
      // Pre-populate year ranges for demonstration
      if (filter.filter_key === 'bouwjaar' && filter.is_range) {
        const currentYear = new Date().getFullYear();
        const yearOptions = [];
        for (let year = 1990; year <= currentYear; year++) {
          yearOptions.push(year.toString());
        }
        return {
          ...filter,
          filter_options: yearOptions,
          min_value: 1990,
          max_value: currentYear
        };
      }

      // Pre-populate mileage ranges
      if (filter.filter_key === 'kilometerstand' && filter.is_range) {
        return {
          ...filter,
          filter_options: [
            '0-25000', '25000-50000', '50000-75000', '75000-100000', 
            '100000-150000', '150000-200000', '200000+'
          ]
        };
      }

      return filter;
    });

    return NextResponse.json({
      category: categorySlug,
      filters: enhancedFilters
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
