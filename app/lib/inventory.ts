import type { CategorySlug } from "./categoryMap";
import { getAllProducts, type DBProduct } from "./db";
import { inferCategoryFromTitle, inferBrandFromTitle } from "./loadStoreProducts";
import { brandMap } from "./brandData";
import { extractSizeFromTitle, extractSizeFromDescription, extractTaggedSizeFromDescription, extractFitSizeFromDescription, isValidSizeValue, GENERIC_CLOTHING_SIZE } from "./shopifyClient";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "One Size"];

const SHOE_RE = /shoe|boot|heel|sneaker|flat|sandal|loafer|pump|mule|slipper|clog/i;

const EU_SHOE_TO_US: Record<string, string> = {
 "35": "5", "35.5": "5",
 "36": "5.5", "36.5": "6",
 "37": "6.5", "37.5": "7",
 "38": "7.5", "38.5": "8",
 "39": "8.5", "39.5": "9",
 "40": "9.5", "40.5": "10",
 "41": "10.5", "41.5": "11",
 "42": "11", "42.5": "11.5",
 "43": "12", "44": "13",
};

function fmtNum(n: number): string {
 return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Convert a raw size string to a US size label, using category context to
 * distinguish shoe EU/UK sizes from clothing EU/UK sizes.
 * Returns null if no conversion applies (caller should display the raw/normalized value).
 */
export function convertSizeToUS(raw: string, categorySlug: string): string | null {
 const s = raw.trim();
 const normalized = normalizeSize(s);
 const isShoe = SHOE_RE.test(categorySlug);

 // EU/IT/FR/DE → normalizeSize outputs "EU XX"
 const euMatch = /^EU\s*(\d+(?:\.\d+)?)$/.exec(normalized);
 if (euMatch) {
 const num = euMatch[1];
 if (isShoe) {
  const us = EU_SHOE_TO_US[num];
  return us ? `US ${us}` : null;
 }
 // Women's clothing: EU - 32 = US
 const eu = parseFloat(num);
 const us = eu - 32;
 if (us >= 0 && us <= 20) return `US ${us}`;
 return null;
 }

 // UK prefix (normalizeSize strips it, so check original)
 const ukMatch = /^UK\s*(\d+(?:\.\d+)?)$/i.exec(s);
 if (ukMatch) {
 const num = parseFloat(ukMatch[1]);
 if (isShoe) return `US ${fmtNum(num + 2)}`;
 const us = num - 4;
 if (us >= 0) return `US ${fmtNum(us)}`;
 return null;
 }

 // Bare numeric — infer from category
 if (/^\d+(?:\.\d+)?$/.test(normalized)) {
 const num = parseFloat(normalized);
 if (isShoe && num >= 35 && num <= 44) {
  const us = EU_SHOE_TO_US[normalized];
  return us ? `US ${us}` : null;
 }
 if (!isShoe && num >= 32 && num <= 52 && num % 2 === 0) {
  return `US ${num - 32}`;
 }
 }

 return null;
}

export function normalizeSize(raw: string): string {
 // Strip leading/trailing whitespace and trailing punctuation
 const s = raw.trim().replace(/[.,]+$/, "").trim();
 const l = s.toLowerCase();

 // Clothing word sizes
 if (/^x{2,}s$/i.test(s) || l === "extra small") return "XS";
 if (/^xs$/i.test(s)) return "XS";
 if (/^s$/i.test(s) || l === "small") return "S";
 if (/^m$/i.test(s) || l === "medium") return "M";
 if (/^l$/i.test(s) || l === "large") return "L";
 if (/^xl$/i.test(s) || l === "extra large") return "XL";
 if (/^(xxl|2xl)$/i.test(s)) return "XXL";
 if (/^(xxxl|3xl)$/i.test(s)) return "XXXL";
 if (/^(os|osfm|one\s*size)$/i.test(s)) return "One Size";

 // Range sizes — collapse to the smaller size
 if (/^(xs)[\/\-](s)$/i.test(s)) return "XS";
 if (/^(s)[\/\-](m)$/i.test(s)) return "S";
 if (/^(m)[\/\-](l)$/i.test(s)) return "M";
 if (/^(l)[\/\-](xl)$/i.test(s)) return "L";
 if (/^(xl)[\/\-](xxl)$/i.test(s)) return "XL";

 // EU / IT / FR / DE are all the same European scale — normalise to "EU XX"
 // e.g. "IT 40", "IT40", "EU 38.", "FR 42" → "EU 40", "EU 38", "EU 42"
 const euMatch = /^(IT|EU|FR|DE)\s*(\d+(?:\.\d+)?)$/i.exec(s);
 if (euMatch) return `EU ${euMatch[2]}`;

 // US/UK sizing: strip prefix, treat as plain number
 const usMatch = /^US\s*(\d+(?:\.\d+)?)$/i.exec(s);
 if (usMatch) return usMatch[1];

 const ukMatch = /^UK\s*(\d+(?:\.\d+)?)$/i.exec(s);
 if (ukMatch) return ukMatch[1];

 // Plain number (already stripped trailing period above)
 if (/^\d+(?:\.\d+)?$/.test(s)) return s;

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

 // Bust / chest — pit-to-pit is a FLAT measurement so double it for circumference
 // Reference: S=34-35", M=36-38", L=39-41", XL=42+"
 const chestMatch = /(?:chest|bust|pit[-\s]to[-\s]pit)\s*:?\s*(\d+(?:\.\d+)?)\s*("|in(?:ches?)?|cm)?/i.exec(text);
 if (chestMatch) {
 let v = parseFloat(chestMatch[1]);
 if (/cm/i.test(chestMatch[2] ?? "")) v /= 2.54;
 const isPitToPit = /pit/i.test(chestMatch[0]);
 if (isPitToPit) v *= 2; // flat → circumference
 if (v < 34) return "XS";
 if (v < 36) return "S";
 if (v < 39) return "M";
 if (v < 42) return "L";
 if (v < 46) return "XL";
 return "XXL";
 }

 // Waist — Reference: S=26-27", M=28-30", L=31-33", XL=34+"
 const waistMatch = /waist\s*:?\s*(\d+(?:\.\d+)?)\s*("|in(?:ches?)?|cm)?/i.exec(text);
 if (waistMatch) {
 let v = parseFloat(waistMatch[1]);
 if (/cm/i.test(waistMatch[2] ?? "")) v /= 2.54;
 if (v < 26) return "XS";
 if (v < 28) return "S";
 if (v < 31) return "M";
 if (v < 34) return "L";
 if (v < 38) return "XL";
 return "XXL";
 }

 // Hips — Reference: S=36-38", M=39-40", L=41-43", XL=44+"
 const hipMatch = /hip(?:s)?\s*:?\s*(\d+(?:\.\d+)?)\s*("|in(?:ches?)?|cm)?/i.exec(text);
 if (hipMatch) {
 let v = parseFloat(hipMatch[1]);
 if (/cm/i.test(hipMatch[2] ?? "")) v /= 2.54;
 if (v < 36) return "XS";
 if (v < 39) return "S";
 if (v < 41) return "M";
 if (v < 44) return "L";
 if (v < 48) return "XL";
 return "XXL";
 }

 // Shoe size from insole length
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
 currency?: string;
 compareAtPrice?: number | null;
 image: string;
 images: string[];
 store: string;
 storeSlug: string;
 externalUrl?: string;
 syncedAt?: string;
 createdAt?: string;
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

/**
 * Derive the best size for a product. Priority:
 * 1. Title extraction — store explicitly wrote size in listing title (e.g. "Dress – M", "(S/M)")
 * 2. Description label — "Size: M", "Tagged size: EU 38" (requires colon for bare "size")
 * 3. Non-generic DB size — numeric / EU/UK prefixed variant option
 * 4. Measurements fallback
 * 5. Generic DB size (S/M/L) — last resort
 *
 * Exported so it can be used by server components that work directly with DBProduct
 * (NewArrivalsSection, new-arrivals page, account favorites, etc.)
 */
export function deriveSize(product: DBProduct): string | null {
 const dbSize = product.size && isValidSizeValue(product.size) ? product.size : null;
 const isGenericDb = dbSize != null && GENERIC_CLOTHING_SIZE.test(dbSize);

 // 0. Explicit seller US fit note ("runs true to a 6", "fits like a 6.5") — the
 // seller telling a US buyer what to order, so it beats a marked EU tag size.
 const fitSize = extractFitSizeFromDescription(product.description);
 if (fitSize) return fitSize;

 // 1. Tagged/labeled/marked size in description — most authoritative (actual garment tag)
 // Must run before title/DB to prevent "Size: Large [store bucket]" from winning
 // over "Tagged size: XS [actual tag]" that appears later in the description.
 const taggedSize = extractTaggedSizeFromDescription(product.description);
 if (taggedSize) return taggedSize;

 // 2. Title — very explicit signal
 const sizeFromTitle = extractSizeFromTitle(product.title);
 if (sizeFromTitle) return sizeFromTitle;

 // 3. Non-generic DB size (numeric, EU/UK prefixed)
 if (dbSize && !isGenericDb) return dbSize;

 // 4. Measurements fallback
 const sizeFromMeasurements = inferSizeFromMeasurements(product.description);
 if (sizeFromMeasurements) return sizeFromMeasurements;

 // 5. Bare description scan (lowest trust — may match store-category text)
 const sizeFromDesc = extractSizeFromDescription(product.description);
 if (sizeFromDesc) return sizeFromDesc;

 // 6. Generic DB size (S/M/L) as last resort
 return dbSize;
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
 currency: product.currency || "USD",
 compareAtPrice: product.compare_at_price != null ? Number(product.compare_at_price) : null,
 image: product.image ?? "/placeholder.jpg",
 images: parseImages(product),
 store: product.store_name,
 storeSlug: product.store_slug,
 externalUrl: product.external_url ?? undefined,
 syncedAt: product.synced_at instanceof Date
 ? product.synced_at.toISOString()
 : String(product.synced_at),
 createdAt: product.created_at instanceof Date
 ? product.created_at.toISOString()
 : product.created_at
 ? String(product.created_at)
 : undefined,
 size: deriveSize(product),
 };
}

/**
 * Fetch all inventory from the database.
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
