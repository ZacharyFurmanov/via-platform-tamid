import type { CategorySlug } from "./categoryMap";

export type StoreProduct = {
  id: string;
  name: string;
  price: string;
  category: CategorySlug; // ✅ slug ONLY
  storeSlug: string;
  externalUrl?: string;
  image?: string;
  images?: string[];
  syncedAt?: string; // ISO timestamp from DB
};
