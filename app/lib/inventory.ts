import type { CategorySlug } from "./categoryMap";
import { getAllProducts, type DBProduct } from "./db";
import { inferCategoryFromTitle, inferBrandFromTitle } from "./loadStoreProducts";
import { brandMap } from "./brandData";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "One Size"];

export function normalizeSize(raw: string): string {
  const s = raw.trim();
  const l = s.toLowerCase();
  if (/^x{2,}s$/i.test(s) || l === "extra small") return "XS";
  if (/^xs$/i.test(s)) return "XS";
  if (/^s$/i.test(s) || l === "small") return "S";
  if (/^m$/i.test(s) || l === "medium") return "M";
  if (/^l$/i.test(s) || l === "large") return "L";
  if (/^xl$/i.test(s) || l === "extra large") return "XL";
  if (/^(xxl|2xl)$/i.test(s)) return "XXL";
  if (/^(xxxl|3xl)$/i.test(s)) return "XXXL";
  if (/^(os|osfm|one\s*size)$/i.test(s)) return "One Size";
  return s;
}

export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a);
    const bi = SIZE_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    const an = parseFloat(a.replace(/[^0-9.]/g, ""));
    const bn = parseFloat(b.replace(/[^0-9.]/g, ""));
    if (!isNaN(an) && !isNaN(bn)) return an - bn;
    return a.localeCompare(b);
  });
}

function inferSizeFromMeasurements(description: string | null): string | null {
  if (!description) return null;
  const text = description.replace(/<[^>]+>/g, " ");

  const chestMatch = /(?:chest|bust|pit[-\s]to[-\s]pit)\s*:?\s*(\d+(?:\.\d+)?)\s*("|in(?:ches?)?|cm)?/i.exec(text);
  if (chestMatch) {
    let v = parseFloat(chestMatch[1]);
    if (/cm/i.test(chestMatch[2] ?? "")) v /= 2.54;
    if (v < 34) return "XS";
    if (v < 36) return "S";
    if (v < 39) return "M";
    if (v < 42) return "L";
    if (v < 45) return "XL";
    return "XXL";
  }

  const waistMatch = /waist\s*:?\s*(\d+(?:\.\d+)?)\s*("|in(?:ches?)?|cm)?/i.exec(text);
  if (waistMatch) {
    let v = parseFloat(waistMatch[1]);
    if (/cm/i.test(waistMatch[2] ?? "")) v /= 2.54;
    if (v < 26) return "XS";
    if (v < 28) return "S";
    if (v < 31) return "M";
    if (v < 34) return "L";
    if (v < 37) return "XL";
    return "XXL";
  }

  const footMatch = /(?:insole|foot\s*length)\s*:?\s*(\d+(?:\.\d+)?)\s*(cm|mm|in(?:ches?)?|")?/i.exec(text);
  if (footMatch) {
    let cm = parseFloat(footMatch[1]);
    const unit = (footMatch[2] ?? "").toLowerCase();
    if (unit === "mm") cm /= 10;
    else if (unit === "in" || unit === "inches" || unit === '"') cm *= 2.54;
    const us = Math.round((cm - 15.2) / 0.667 + 1);
    if (us >= 4 && us <= 15) return `US ${us}`;
  }

  return null;
}

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
  syncedAt?: string;
  size?: string | null;
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
function transformDBProduct(product: DBProduct): InventoryItem {
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
    syncedAt: product.synced_at instanceof Date
      ? product.synced_at.toISOString()
      : String(product.synced_at),
    size: product.size ?? inferSizeFromMeasurements(product.description) ?? null,
  };
}

/**
 * Fetch all inventory from the database.
 * Pass isMember=true to include products added in the last 24 hours (Insider access).
 */
export async function getInventory(isMember: boolean = false): Promise<InventoryItem[]> {
  try {
    const products = await getAllProducts(isMember);
    return products.map(transformDBProduct);
  } catch (error) {
    console.error("Failed to fetch inventory from database:", error);
    return [];
  }
}

// Legacy export for backwards compatibility (returns empty array, use getInventory() instead)
export const inventory: InventoryItem[] = [];
