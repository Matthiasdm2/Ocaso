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

    // Get category filters for this category from database
    const { data: filters, error } = await supabase
      .from('category_filters')
      .select('*')
      .eq('category_slug', categorySlug)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching category filters:', error);
      return NextResponse.json(
        { error: 'Failed to fetch category filters' },
        { status: 500 }
      );
    }

    if (!filters || filters.length === 0) {
      return NextResponse.json(
        { error: 'No filters found for this category' },
        { status: 404 }
      );
    }

    // Transform database format to expected frontend format
    const transformedFilters = filters.map((filter) => ({
      id: filter.filter_key,
      type: filter.filter_type,
      label: filter.label,
      placeholder: filter.placeholder,
      options: filter.options || [],
      min: filter.validation?.min,
      max: filter.validation?.max,
      step: filter.validation?.step
    }));

    return NextResponse.json(transformedFilters);

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
