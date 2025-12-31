"use client";
import { useEffect, useState } from 'react';

import { getCategoriesWithSubcategories } from '@/lib/services/category.service';

import CategorySidebar, { type CategorySidebarCategory } from './CategorySidebar';

/**
 * CategorySidebarContainer - Wrapper that loads categories from Supabase
 * This replaces direct usage of the old hardcoded CATEGORIES
 */
export default function CategorySidebarContainer() {
  const [categories, setCategories] = useState<CategorySidebarCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoading(true);
        setError(null);
        
        const categoriesData = await getCategoriesWithSubcategories();
        
        // Transform to CategorySidebarCategory format
        const transformedCategories: CategorySidebarCategory[] = categoriesData.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          subcategories: cat.subcategories.map(sub => ({
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
          })),
        }));

        setCategories(transformedCategories);
      } catch (err) {
        console.error('Failed to load categories:', err);
        setError('Failed to load categories');
        
        // Fallback to empty array
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }

    loadCategories();
  }, []);

  if (loading) {
    return (
      <aside className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 h-fit">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 h-fit">
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">Categorieën konden niet geladen worden</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-xs text-primary mt-1 hover:underline"
          >
            Probeer opnieuw
          </button>
        </div>
      </aside>
    );
  }

  return <CategorySidebar categories={categories} />;
}
