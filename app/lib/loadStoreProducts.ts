import type { StoreProduct } from "./types";
import type { CategorySlug } from "@/app/lib/categoryMap";
import { getProductsByStore, type DBProduct } from "./db";

export const inferCategoryFromTitle = (title: string): CategorySlug => {
  const t = title.toLowerCase();

  if (
    // Product types
    t.includes("heel") ||
    t.includes("shoe") ||
    t.includes("boot") ||
    t.includes("pump") ||
    t.includes("sandal") ||
    t.includes("mule") ||
    t.includes("clog") ||
    t.includes("loafer") ||
    t.includes("sneaker") ||
    t.includes("slipper") ||
    t.includes("espadrille") ||
    t.includes("stiletto") ||
    t.includes("wedge") ||
    t.includes("oxford") ||
    t.includes("derby") ||
    t.includes("brogue") ||
    t.includes("trainer") ||
    t.includes("slide") ||
    t.includes("flat") ||
    t.includes("slingback") ||
    // Shoe-only brands
    t.includes("blahnik") ||
    t.includes("louboutin") ||
    t.includes("stuart weitzman") ||
    t.includes("roger vivier")
  ) {
    return "shoes";
  }

  if (
    t.includes("bag") ||
    t.includes("clutch") ||
    t.includes("tote") ||
    t.includes("purse") ||
    t.includes("handbag")
  ) {
    return "bags";
  }

  if (
    t.includes("belt") ||
    t.includes("scarf") ||
    t.includes("hat") ||
    t.includes("sunglasses") ||
    t.includes("jewelry") ||
    t.includes("necklace") ||
    t.includes("bracelet") ||
    t.includes("earring") ||
    t.includes("watch")
  ) {
    return "accessories";
  }

  // Default to clothes for everything else
  return "clothes";
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

// Transform database product to StoreProduct format
function transformDBProduct(product: DBProduct): StoreProduct {
  const priceString = `$${Number(product.price)}`;

  return {
    id: `${product.store_slug}-${product.id}`,
    name: product.title,
    price: priceString,
    category: inferCategoryFromTitle(product.title),
    storeSlug: product.store_slug,
    externalUrl: product.external_url ?? undefined,
    image: product.image ?? undefined,
    images: parseImages(product),
  };
}

/**
 * Load products for a specific store from the database
 */
export async function loadStoreProducts(storeSlug: string): Promise<StoreProduct[]> {
  try {
    const products = await getProductsByStore(storeSlug);
    return products.map(transformDBProduct);
  } catch (error) {
    console.error(`Failed to load products for store ${storeSlug}:`, error);
    return [];
  }
}
