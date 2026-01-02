import { createClient } from '@supabase/supabase-js';
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

    // Use anon client for public filter data (no auth required)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !anonKey) {
      console.error('[VEHICLE_FILTERS_API] Missing Supabase env vars');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false }
    });

    // Get category filters from database
    const { data: filters, error } = await supabase
      .from('category_filters')
      .select('*')
      .eq('category_slug', categorySlug);

    if (error) {
      console.error('[VEHICLE_FILTERS_API] Error fetching category filters:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        categorySlug
      });
      
      // Return error with more details for debugging
      return NextResponse.json(
        { 
          error: 'Failed to fetch category filters', 
          details: error.message,
          code: error.code,
          categorySlug
        },
        { status: 500 }
      );
    }
    
    console.log('[VEHICLE_FILTERS_API] Fetched filters:', {
      categorySlug,
      count: filters?.length || 0,
      filters: filters?.map(f => ({ key: f.filter_key || f.filter_key, label: f.filter_label || f.label }))
    });

    interface FilterRow {
      sort_order?: number | null;
      display_order?: number | null;
      filter_key?: string;
      filter_label?: string;
      label?: string;
      filter_options?: unknown;
      options?: unknown;
      is_range?: boolean;
      input_type?: string;
      filter_type?: string;
      min_value?: number | null;
      max_value?: number | null;
      validation?: { min?: number; max?: number };
      placeholder?: string | null;
      id?: number;
    }

    // Sort by sort_order or display_order, whichever exists
    if (filters && filters.length > 0) {
      filters.sort((a: FilterRow, b: FilterRow) => {
        const orderA = a.sort_order ?? a.display_order ?? 0;
        const orderB = b.sort_order ?? b.display_order ?? 0;
        return orderA - orderB;
      });
    }

    if (!filters || filters.length === 0) {
      // Return empty filters array instead of error - frontend handles empty state
      return NextResponse.json({
        category: categorySlug,
        filters: []
      });
    }

    // Transform database format to expected frontend format
    // Handle both schema formats: marketplace (filter_label) and sell page (label)
    const transformedFilters = (filters as FilterRow[]).map((filter, index) => {
      // Check which schema format we have
      const hasFilterLabel = 'filter_label' in filter;
      const hasLabel = 'label' in filter;
      
      // Extract filter_options - could be JSONB array or string array
      let filterOptions: string[] = [];
      
      // Try marketplace schema first (filter_options)
      if (hasFilterLabel && filter.filter_options !== null && filter.filter_options !== undefined) {
        // Marketplace schema: filter_options is JSONB array
        if (Array.isArray(filter.filter_options)) {
          // Already an array - use directly
          filterOptions = filter.filter_options.filter((opt: unknown) => opt !== null && opt !== undefined) as string[];
        } else if (typeof filter.filter_options === 'string') {
          // JSON string - parse it
          try {
            const parsed = JSON.parse(filter.filter_options);
            if (Array.isArray(parsed)) {
              filterOptions = parsed.filter((opt: unknown) => opt !== null && opt !== undefined) as string[];
            }
          } catch (e) {
            console.warn('[VEHICLE_FILTERS_API] Failed to parse filter_options string:', filter.filter_options, e);
            filterOptions = [];
          }
        }
      }
      
      // Try sell page schema (options) if marketplace schema didn't work
      if (filterOptions.length === 0 && hasLabel && filter.options !== null && filter.options !== undefined) {
        // Sell page schema: options is JSONB array
        if (Array.isArray(filter.options)) {
          // Extract value or label from option objects
          filterOptions = filter.options
            .filter((opt: unknown) => opt !== null && opt !== undefined)
            .map((opt: unknown) => {
              if (typeof opt === 'string') return opt;
              const optObj = opt as { value?: string; label?: string };
              return optObj.value || optObj.label || String(opt);
            });
        } else if (typeof filter.options === 'string') {
          try {
            const parsed = JSON.parse(filter.options);
            if (Array.isArray(parsed)) {
              filterOptions = parsed
                .filter((opt: unknown) => opt !== null && opt !== undefined)
                .map((opt: unknown) => typeof opt === 'string' ? opt : ((opt as { value?: string; label?: string }).value || (opt as { value?: string; label?: string }).label || String(opt)));
            }
          } catch (e) {
            console.warn('[VEHICLE_FILTERS_API] Failed to parse options string:', filter.options, e);
            filterOptions = [];
          }
        }
      }
      
      console.log('[VEHICLE_FILTERS_API] Extracted filterOptions:', {
        filter_key: filter.filter_key,
        hasFilterLabel,
        hasLabel,
        raw_filter_options: filter.filter_options,
        raw_options: filter.options,
        extracted_count: filterOptions.length,
        extracted_options: filterOptions
      });

      // Determine input_type and is_range based on filter_key and database settings
      const filterKey = filter.filter_key?.toLowerCase() || '';
      let inputType = 'select';
      let isRange = false;
      
      if (hasFilterLabel) {
        // Marketplace schema: use input_type and is_range directly
        isRange = filter.is_range || false;
        inputType = filter.input_type || 'select';
        
        // Override based on filter_key for specific requirements
        if (filterKey === 'bouwjaar' || filterKey === 'year') {
          // Bouwjaar: range veld (min/max inputs)
          inputType = 'range';
          isRange = true;
          filterOptions = []; // No dropdown options
        } else if (filterKey === 'kilometerstand' || filterKey === 'mileage_km') {
          // Kilometerstand: range veld (min/max inputs)
          inputType = 'range';
          isRange = true;
          filterOptions = []; // No dropdown options
        } else if (filterKey === 'vermogen' || filterKey === 'power_hp') {
          // Vermogen: range veld (min/max inputs)
          inputType = 'range';
          isRange = true;
          filterOptions = []; // No dropdown options
        } else {
          // For other filters: check if they have options
          if (filterOptions.length > 0) {
            // Filters met opties: dropdown
            inputType = 'select';
            isRange = false;
          } else {
            // No options: keep original input_type from database
            // (could be select, number, etc.)
          }
        }
      } else if (hasLabel) {
        // Sell page schema: infer from filter_type
        if (filterKey === 'bouwjaar' || filterKey === 'year') {
          inputType = 'range';
          isRange = true;
          filterOptions = [];
        } else if (filterKey === 'kilometerstand' || filterKey === 'mileage_km') {
          inputType = 'range';
          isRange = true;
          filterOptions = [];
        } else if (filterKey === 'vermogen' || filterKey === 'power_hp') {
          inputType = 'range';
          isRange = true;
          filterOptions = [];
        } else {
          // Check if options exist for dropdown
          if (filterOptions.length > 0) {
            inputType = 'select';
            isRange = false;
          } else {
            isRange = filter.filter_type === 'number';
            inputType = isRange ? 'range' : 'select';
          }
        }
      }

      // Set default min/max values for range and number filters if not provided
      let minValue = filter.min_value || filter.validation?.min;
      let maxValue = filter.max_value || filter.validation?.max;
      
      const currentYear = new Date().getFullYear();
      
      if (filterKey === 'bouwjaar' || filterKey === 'year') {
        // Bouwjaar: always set min/max for range inputs
        minValue = minValue || 1900;
        maxValue = maxValue || currentYear;
      } else if (filterKey === 'kilometerstand' || filterKey === 'mileage_km') {
        // Kilometerstand: always set min/max for range inputs
        minValue = minValue || 0;
        maxValue = maxValue || 1000000; // Allow up to 1 million km
      } else if (filterKey === 'vermogen' || filterKey === 'power_hp') {
        // Vermogen: always set min/max for range inputs
        minValue = minValue || 0;
        maxValue = maxValue || 2000; // Up to 2000 kW
      } else if (isRange && (!minValue || !maxValue)) {
        // Other range filters: set sensible defaults
        if (filter.filter_key === 'cilinderinhoud') {
          minValue = minValue || 0;
          maxValue = maxValue || 5000;
        } else if (filter.filter_key === 'laadvermogen') {
          minValue = minValue || 0;
          maxValue = maxValue || 10000;
        } else if (filter.filter_key === 'lengte') {
          minValue = minValue || 0;
          maxValue = maxValue || 15;
        }
      }

      const transformedFilter = {
        id: filter.id || index + 1,
        filter_key: filter.filter_key,
        filter_label: hasFilterLabel ? filter.filter_label : (hasLabel ? filter.label : 'Filter'),
        filter_options: filterOptions,
        placeholder: filter.placeholder || `Kies ${hasFilterLabel ? filter.filter_label : (hasLabel ? filter.label : 'filter')}`,
        input_type: inputType,
        is_range: isRange,
        min_value: minValue,
        max_value: maxValue,
        sort_order: filter.sort_order || filter.display_order || index * 10
      };
      
      // Debug logging
      console.log('[VEHICLE_FILTERS_API] Transformed filter:', {
        key: transformedFilter.filter_key,
        label: transformedFilter.filter_label,
        input_type: transformedFilter.input_type,
        is_range: transformedFilter.is_range,
        options_count: transformedFilter.filter_options.length,
        options: transformedFilter.filter_options
      });
      
      return transformedFilter;
    });

    return NextResponse.json({
      category: categorySlug,
      filters: transformedFilters
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
