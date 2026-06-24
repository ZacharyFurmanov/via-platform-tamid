import { NextResponse } from "next/server";
import { isApprovedRequest } from "@/app/lib/approval";
import { neon } from "@neondatabase/serverless";
import { visibleStores } from "@/app/lib/stores";
import { formatPrice } from "@/app/lib/formatPrice";
import { SHOPIFY_STORES } from "@/app/lib/storeConfig";
import { parseFilters, applyJsFilters } from "@/app/lib/publicFilters";
import { getCategoryOverrideMap } from "@/app/lib/category-overrides-db";
import { getProductPopularityScores } from "@/app/lib/analytics-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
 if (!(await isApprovedRequest(request))) return NextResponse.json({ error: "Approval required", needsApproval: true }, { status: 403 });
 const { slug } = await ctx.params;
 const { searchParams } = new URL(request.url);
 const filters = parseFilters(searchParams);
 const storeInfo = visibleStores.find((s) => s.slug === slug);
 if (!storeInfo) {
 return NextResponse.json({ error: "Store not found" }, { status: 404 });
 }

 const storePayload = {
 slug: storeInfo.slug,
 name: storeInfo.name,
 location: storeInfo.location ?? null,
 image: storeInfo.image ?? null,
 logo: storeInfo.logo ?? null,
 logoBg: (storeInfo as { logoBg?: string }).logoBg ?? "#ffffff",
 description: storeInfo.description ?? null,
 website: storeInfo.website ?? null,
 };

 const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!dbUrl) return NextResponse.json({ store: storePayload, products: [] });

 const sql = neon(dbUrl);
 const shopifySlugs = SHOPIFY_STORES.map((s) => s.slug);

 const sizesUpper = filters.sizes.map((s) => s.toUpperCase());
 const useSizes = sizesUpper.length > 0;
 const usePriceMin = filters.priceMin != null;
 const usePriceMax = filters.priceMax != null;
 const priceMin = filters.priceMin ?? 0;
 const priceMax = filters.priceMax ?? 1e12;

 try {
 let rows: Array<Record<string, unknown>>;
 if (filters.sort === "priceAsc") {
 rows = await sql`
  SELECT id, store_slug, store_name, title, price, currency, image, images, size
  FROM products
  WHERE store_slug = ${slug}
  AND image IS NOT NULL AND image != ''
  AND title NOT ILIKE '%gift card%'
  AND (store_slug != ALL(${shopifySlugs}) OR collabs_link IS NOT NULL)
  AND (${!useSizes} OR UPPER(size) = ANY(${sizesUpper}))
  AND (${!usePriceMin} OR price >= ${priceMin})
  AND (${!usePriceMax} OR price <= ${priceMax})
  ORDER BY price ASC, id DESC
  LIMIT 500
 ` as Array<Record<string, unknown>>;
 } else if (filters.sort === "priceDesc") {
 rows = await sql`
  SELECT id, store_slug, store_name, title, price, currency, image, images, size
  FROM products
  WHERE store_slug = ${slug}
  AND image IS NOT NULL AND image != ''
  AND title NOT ILIKE '%gift card%'
  AND (store_slug != ALL(${shopifySlugs}) OR collabs_link IS NOT NULL)
  AND (${!useSizes} OR UPPER(size) = ANY(${sizesUpper}))
  AND (${!usePriceMin} OR price >= ${priceMin})
  AND (${!usePriceMax} OR price <= ${priceMax})
  ORDER BY price DESC, id DESC
  LIMIT 500
 ` as Array<Record<string, unknown>>;
 } else {
 rows = await sql`
  SELECT id, store_slug, store_name, title, price, currency, image, images, size
  FROM products
  WHERE store_slug = ${slug}
  AND image IS NOT NULL AND image != ''
  AND title NOT ILIKE '%gift card%'
  AND (store_slug != ALL(${shopifySlugs}) OR collabs_link IS NOT NULL)
  AND (${!useSizes} OR UPPER(size) = ANY(${sizesUpper}))
  AND (${!usePriceMin} OR price >= ${priceMin})
  AND (${!usePriceMax} OR price <= ${priceMax})
  ORDER BY created_at DESC NULLS LAST, id DESC
  LIMIT 500
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
  size: (p.size as string | null) ?? null,
 };
 });

 products = applyJsFilters(products, filters, await getCategoryOverrideMap());

 if (filters.sort === "popular") {
 const scores = await getProductPopularityScores(products.map((p) => p.id));
 products = products.sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
 }

 return NextResponse.json({ store: storePayload, products });
 } catch {
 return NextResponse.json({ store: storePayload, products: [] });
 }
}
