import { NextResponse } from 'next/server';

import { getCategoriesWithSubcategories } from '@/lib/services/category.service';

export async function GET() {
  try {
    const categories = await getCategoriesWithSubcategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
