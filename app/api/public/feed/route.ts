import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { formatPrice } from "@/app/lib/formatPrice";
import { SHOPIFY_STORES } from "@/app/lib/storeConfig";
import { HIDDEN_STORE_SLUGS } from "@/app/lib/stores";
import { parseFilters, applyJsFilters } from "@/app/lib/publicFilters";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
 const { searchParams } = new URL(request.url);
 const limit = Math.min(parseInt(searchParams.get("limit") ?? "60"), 200);
 const filters = parseFilters(searchParams);

 const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!dbUrl) return NextResponse.json({ products: [] });

 const sql = neon(dbUrl);
 const shopifySlugs = SHOPIFY_STORES.map((s) => s.slug);
 const hidden = ["velvet-archive", ...HIDDEN_STORE_SLUGS];

 const sizesUpper = filters.sizes.map((s) => s.toUpperCase());
 const useSizes = sizesUpper.length > 0;
 const useStores = filters.stores.length > 0;
 const usePriceMin = filters.priceMin != null;
 const usePriceMax = filters.priceMax != null;
 const priceMin = filters.priceMin ?? 0;
 const priceMax = filters.priceMax ?? 1e12;

 try {
 // Fetch more than needed so JS-side category filtering still returns enough
 const fetchLimit = filters.categories.length > 0 ? Math.min(limit * 5, 500) : limit;

 let rows: Array<Record<string, unknown>>;

 if (filters.sort === "priceAsc") {
 rows = await sql`
  SELECT id, store_slug, store_name, title, price, currency, image, images
  FROM products
  WHERE image IS NOT NULL AND image != ''
  AND title NOT ILIKE '%gift card%'
  AND (store_slug != ALL(${shopifySlugs}) OR collabs_link IS NOT NULL)
  AND (${hidden.length} = 0 OR store_slug != ALL(${hidden}))
  AND (${!useSizes} OR UPPER(size) = ANY(${sizesUpper}))
  AND (${!useStores} OR store_slug = ANY(${filters.stores}))
  AND (${!usePriceMin} OR price >= ${priceMin})
  AND (${!usePriceMax} OR price <= ${priceMax})
  ORDER BY price ASC, id DESC
  LIMIT ${fetchLimit}
 ` as Array<Record<string, unknown>>;
 } else if (filters.sort === "priceDesc") {
 rows = await sql`
  SELECT id, store_slug, store_name, title, price, currency, image, images
  FROM products
  WHERE image IS NOT NULL AND image != ''
  AND title NOT ILIKE '%gift card%'
  AND (store_slug != ALL(${shopifySlugs}) OR collabs_link IS NOT NULL)
  AND (${hidden.length} = 0 OR store_slug != ALL(${hidden}))
  AND (${!useSizes} OR UPPER(size) = ANY(${sizesUpper}))
  AND (${!useStores} OR store_slug = ANY(${filters.stores}))
  AND (${!usePriceMin} OR price >= ${priceMin})
  AND (${!usePriceMax} OR price <= ${priceMax})
  ORDER BY price DESC, id DESC
  LIMIT ${fetchLimit}
 ` as Array<Record<string, unknown>>;
 } else {
 rows = await sql`
  SELECT id, store_slug, store_name, title, price, currency, image, images, created_at
  FROM products
  WHERE image IS NOT NULL AND image != ''
  AND title NOT ILIKE '%gift card%'
  AND (store_slug != ALL(${shopifySlugs}) OR collabs_link IS NOT NULL)
  AND (${hidden.length} = 0 OR store_slug != ALL(${hidden}))
  AND (${!useSizes} OR UPPER(size) = ANY(${sizesUpper}))
  AND (${!useStores} OR store_slug = ANY(${filters.stores}))
  AND (${!usePriceMin} OR price >= ${priceMin})
  AND (${!usePriceMax} OR price <= ${priceMax})
  ORDER BY created_at DESC NULLS LAST, id DESC
  LIMIT ${fetchLimit}
 ` as Array<Record<string, unknown>>;
 }

 let products = rows.map((p) => {
 let parsedImages: string[] | undefined;
 try {
  parsedImages = p.images ? JSON.parse(p.images as string) : undefined;
 } catch {}
 return {
  id: p.id as number,
  name: p.title as string,
  storeSlug: p.store_slug as string,
  storeName: p.store_name as string,
  price: formatPrice(Number(p.price), p.currency as string | null),
  image: p.image as string | null,
  images: parsedImages,
 };
 });

 products = applyJsFilters(products, filters).slice(0, limit);

 return NextResponse.json({ products });
 } catch {
 return NextResponse.json({ products: [] });
 }
}
