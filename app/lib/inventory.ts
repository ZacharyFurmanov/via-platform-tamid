import type { CategorySlug } from "./categoryMap";
import { getAllProducts, type DBProduct } from "./db";
import { inferCategoryFromTitle, inferBrandFromTitle } from "./loadStoreProducts";
import { brandMap } from "./brandData";

export type InventoryItem = {
  id: string;
  title: string;
  category: CategorySlug;
  brand: string | null;
  brandLabel: string | null;
  price: number;
  image: string;
  images: string[];
  store: string;
  storeSlug: string;
  externalUrl?: string;
};

// Parse images JSON from DB, falling back to single image
function parseImages(product: DBProduct): string[] {
  if (product.images) {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  return product.image ? [product.image] : [];
}

// Transform database products to InventoryItem format
function transformDBProduct(product: DBProduct, idx: number): InventoryItem {
  const brandSlug = inferBrandFromTitle(product.title);
  return {
    id: `${product.store_slug}-${product.id}`,
    title: product.title,
    category: inferCategoryFromTitle(product.title),
    brand: brandSlug,
    brandLabel: brandSlug ? (brandMap[brandSlug] ?? null) : null,
    price: Number(product.price),
    image: product.image ?? "/placeholder.jpg",
    images: parseImages(product),
    store: product.store_name,
    storeSlug: product.store_slug,
    externalUrl: product.external_url ?? undefined,
  };
}

/**
 * Fetch all inventory from the database
 */
export async function getInventory(): Promise<InventoryItem[]> {
  try {
    const products = await getAllProducts();
    return products.map(transformDBProduct);
  } catch (error) {
    console.error("Failed to fetch inventory from database:", error);
    return [];
  }
}

// Legacy export for backwards compatibility (returns empty array, use getInventory() instead)
export const inventory: InventoryItem[] = [];
