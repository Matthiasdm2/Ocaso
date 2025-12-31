import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getVehicleBrandsByCategorySlug } from '@/lib/services/category.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category');
    
    if (!categorySlug) {
      return NextResponse.json(
        { error: 'Category slug is required' },
        { status: 400 }
      );
    }

    const brands = await getVehicleBrandsByCategorySlug(categorySlug);
    return NextResponse.json(brands);
  } catch (error) {
    console.error('Error fetching vehicle brands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle brands' },
      { status: 500 }
    );
  }
}
