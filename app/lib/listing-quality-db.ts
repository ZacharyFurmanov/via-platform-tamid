import { neon } from "@neondatabase/serverless";
import { deriveSize } from "./inventory";
import { inferCategoryFromTitle } from "./loadStoreProducts";
import type { DBProduct } from "./db";

// What each category actually needs. A bag has no clothing/shoe SIZE but should
// list MEASUREMENTS (dimensions); jewelry/accessories need neither — just a
// description and image. So we only flag what's relevant to the item.
const SIZE_CATS = new Set([
 "tops", "sweaters", "coats-jackets", "pants", "jeans", "dresses", "skirts", "shorts",
 "jumpsuits", "lingerie", "swimwear", "other-clothing",
 "shoes", "boots", "heels", "sneakers", "sandals", "flats",
]);
const MEASUREMENT_CATS = new Set([
 "tops", "sweaters", "coats-jackets", "pants", "jeans", "dresses", "skirts", "shorts",
 "jumpsuits", "lingerie", "swimwear", "other-clothing",
 "bags", "totes", "clutches", "crossbody-bags", "handbags",
]);

// ───────────────────────────────────────────────────────────────────────────
// Listing-quality audit (admin). Flags which products are missing the things
// that help vintage pieces sell: a size, body measurements, a description, and
// a real image. Lists the actual products so they can be fixed, plus a per-store
// summary of how many are incomplete.
// ───────────────────────────────────────────────────────────────────────────

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("No database URL");
 return neon(url);
}

// Does the description contain at least one body measurement?
function hasMeasurements(desc: string | null): boolean {
 if (!desc) return false;
 const t = desc.replace(/<[^>]+>/g, " ");
 return /(bust|chest|waist|hip|pit[-\s]to[-\s]pit|shoulder|sleeve|inseam|insole|length)\s*:?\s*~?\s*\d/i.test(t);
}

export type QualityProduct = {
 id: number;
 storeSlug: string;
 storeName: string;
 title: string;
 url: string;
 noSize: boolean;
 noMeasurements: boolean;
 noDescription: boolean;
 noImage: boolean;
};

export type StoreSummary = {
 storeSlug: string;
 storeName: string;
 total: number;
 flagged: number;
 noSize: number;
 noMeasurements: number;
 noDescription: number;
 noImage: number;
};

export type ListingQuality = { stores: StoreSummary[]; products: QualityProduct[] };

export async function getListingQuality(storeSlug?: string): Promise<ListingQuality> {
 const sql = db();
 const rows = (storeSlug
 ? await sql`SELECT id, store_slug, store_name, title, description, size, image FROM products WHERE store_slug = ${storeSlug} ORDER BY id DESC`
 : await sql`SELECT id, store_slug, store_name, title, description, size, image FROM products ORDER BY store_slug, id DESC`) as Array<{
 id: number; store_slug: string; store_name: string; title: string; description: string | null; size: string | null; image: string | null;
 }>;

 const byStore = new Map<string, StoreSummary>();
 const products: QualityProduct[] = [];

 for (const r of rows) {
 const category = inferCategoryFromTitle(r.title);
 const noImage = !r.image || /placeholder/i.test(r.image);
 const noDescription = !r.description || r.description.replace(/<[^>]+>/g, "").trim().length < 20;
 // Only flag size where a size applies (clothing/shoes), measurements where
 // they apply (clothing/bags). Jewelry, accessories, home → neither.
 const noSize = SIZE_CATS.has(category) && !deriveSize({ title: r.title, description: r.description, size: r.size } as DBProduct);
 const noMeasurements = MEASUREMENT_CATS.has(category) && !hasMeasurements(r.description);

 let s = byStore.get(r.store_slug);
 if (!s) {
  s = { storeSlug: r.store_slug, storeName: r.store_name, total: 0, flagged: 0, noSize: 0, noMeasurements: 0, noDescription: 0, noImage: 0 };
  byStore.set(r.store_slug, s);
 }
 s.total++;

 if (noSize || noMeasurements || noDescription || noImage) {
  s.flagged++;
  if (noSize) s.noSize++;
  if (noMeasurements) s.noMeasurements++;
  if (noDescription) s.noDescription++;
  if (noImage) s.noImage++;
  products.push({
  id: r.id,
  storeSlug: r.store_slug,
  storeName: r.store_name,
  title: r.title,
  url: `/products/${r.store_slug}-${r.id}`,
  noSize, noMeasurements, noDescription, noImage,
  });
 }
 }

 return {
 stores: [...byStore.values()].sort((a, b) => b.flagged - a.flagged),
 products: products.slice(0, 1500),
 };
}
