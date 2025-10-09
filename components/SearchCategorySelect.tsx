"use client";

import { useRouter, useSearchParams } from "next/navigation";

import CategorySelect from "@/components/CategorySelect";

export default function SearchCategorySelect({ category, subcategory }: { category: string; subcategory: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCategoryChange = (newCat: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newCat) {
      params.set('category', newCat);
    } else {
      params.delete('category');
    }
    params.delete('sub'); // reset sub when category changes
    router.push(`/search?${params.toString()}`);
  };

  const handleSubcategoryChange = (newSub: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSub) {
      params.set('sub', newSub);
    } else {
      params.delete('sub');
    }
    router.push(`/search?${params.toString()}`);
  };

  return (
    <CategorySelect
      valueCategory={category}
      valueSubcategory={subcategory}
      onChangeCategory={handleCategoryChange}
      onChangeSubcategory={handleSubcategoryChange}
    />
  );
}
