// types/category.ts
export type Category = {
  id: string;            // slug (uniek)
  name: string;          // weergavenaam
  parent_id?: string | null;
  position?: number | null;
};

export type CategoryResponse = {
  id: string;            // parent slug
  name: string;
  subcategories: string[]; // lijst met subcat-namen
};
