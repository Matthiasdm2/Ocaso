export type Category = {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  subs: Subcategory[];
};

export type Subcategory = {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  category_id: number;
};

export type Listing = {
  id: string;
  title: string;
  price: number;
  location?: string;
  state?: "new" | "like-new" | "good" | "used";
  description?: string;
  images?: string[];
  main_photo?: string;
  listing_number?: number;
  created_at?: string;
  isBusinessSeller?: boolean;
  sponsored?: boolean;
};
