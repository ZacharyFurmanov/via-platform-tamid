import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { formatPrice } from "@/app/lib/formatPrice";
import { SHOPIFY_STORES } from "@/app/lib/storeConfig";
import { HIDDEN_STORE_SLUGS } from "@/app/lib/stores";
import { getMobileUserId } from "@/app/lib/mobileAuth";

export const dynamic = "force-dynamic";

/**
 * Personalized product feed for the mobile home screen.
 *
 * Signal model (last 90 days, scored):
 *   favorite = 5, click = 3, view = 1
 * Aggregated into per-user top stores + top sizes. Returns recent products
 * from those stores, excluding ones the user has already viewed/favorited.
 *
 * If no signal yet → falls back to new arrivals from the last 14 days.
 */
export async function GET(request: Request) {
 const { searchParams } = new URL(request.url);
 const limit = Math.min(parseInt(searchParams.get("limit") ?? "60"), 200);

 const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!dbUrl) return NextResponse.json({ products: [], personalized: false });

 const sql = neon(dbUrl);
 const userId = getMobileUserId(request);
 const shopifySlugs = SHOPIFY_STORES.map((s) => s.slug);
 const hidden = ["velvet-archive", ...HIDDEN_STORE_SLUGS];

 // No user → fallback to new arrivals
 if (!userId) {
 const rows = await sql`
  SELECT id, store_slug, store_name, title, price, currency, image, images
  FROM products
  WHERE image IS NOT NULL AND image != ''
  AND title NOT ILIKE '%gift card%'
  AND created_at IS NOT NULL AND created_at >= NOW() - INTERVAL '14 days'
  AND (store_slug != ALL(${shopifySlugs}) OR collabs_link IS NOT NULL)
  AND (${hidden.length} = 0 OR store_slug != ALL(${hidden}))
  ORDER BY created_at DESC, id DESC
  LIMIT ${limit}
 ` as Array<Record<string, unknown>>;
 return NextResponse.json({
  products: rows.map(mapRow),
  personalized: false,
 });
 }

 try {
 // ============ Build signal profile ============
 // Pull a unified activity list: store_slug, weight, product_id, size, price
 // joined to the products table for size + store info.
 const signalRows = await sql`
  WITH activity AS (
  SELECT
   c.product_id::int AS product_id,
   c.store_slug,
   5 AS weight
  FROM clicks c
  WHERE c.user_id = ${userId}
   AND c.timestamp >= NOW() - INTERVAL '90 days'
   AND c.store_slug IS NOT NULL
  UNION ALL
  SELECT
   pf.product_id::int AS product_id,
   NULL AS store_slug,
   8 AS weight
  FROM product_favorites pf
  WHERE pf.user_id = ${userId}
  UNION ALL
  SELECT
   pv.product_id::int AS product_id,
   NULL AS store_slug,
   1 AS weight
  FROM product_views pv
  WHERE pv.user_id = ${userId}
   AND pv.timestamp >= NOW() - INTERVAL '60 days'
  )
  SELECT
  COALESCE(a.store_slug, p.store_slug) AS store_slug,
  p.size,
  SUM(a.weight)::int AS score
  FROM activity a
  LEFT JOIN products p ON p.id = a.product_id
  WHERE COALESCE(a.store_slug, p.store_slug) IS NOT NULL
  GROUP BY 1, 2
 ` as Array<{ store_slug: string; size: string | null; score: number }>;

 if (signalRows.length === 0) {
  // No history → fallback
  const rows = await sql`
  SELECT id, store_slug, store_name, title, price, currency, image, images
  FROM products
  WHERE image IS NOT NULL AND image != ''
   AND title NOT ILIKE '%gift card%'
   AND created_at IS NOT NULL AND created_at >= NOW() - INTERVAL '14 days'
   AND (store_slug != ALL(${shopifySlugs}) OR collabs_link IS NOT NULL)
   AND (${hidden.length} = 0 OR store_slug != ALL(${hidden}))
  ORDER BY created_at DESC, id DESC
  LIMIT ${limit}
  ` as Array<Record<string, unknown>>;
  return NextResponse.json({
  products: rows.map(mapRow),
  personalized: false,
  });
 }

 // Aggregate scores per store and per size
 const storeScores = new Map<string, number>();
 const sizeScores = new Map<string, number>();
 for (const row of signalRows) {
  storeScores.set(row.store_slug, (storeScores.get(row.store_slug) ?? 0) + row.score);
  if (row.size) {
   const s = row.size.toUpperCase();
   sizeScores.set(s, (sizeScores.get(s) ?? 0) + row.score);
  }
 }

 const topStores = Array.from(storeScores.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8)
  .map(([slug]) => slug);

 const topSizes = Array.from(sizeScores.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6)
  .map(([s]) => s);

 // Exclude products already favorited or viewed (we want them to discover new ones)
 const seenRows = await sql`
  SELECT product_id::int AS pid FROM product_favorites WHERE user_id = ${userId}
  UNION
  SELECT product_id::int AS pid FROM product_views WHERE user_id = ${userId}
 ` as Array<{ pid: number }>;
 const excludeIds = seenRows.map((r) => r.pid);

 const useSizes = topSizes.length > 0;

 const rows = await sql`
  SELECT id, store_slug, store_name, title, price, currency, image, images, size, created_at
  FROM products
  WHERE image IS NOT NULL AND image != ''
   AND title NOT ILIKE '%gift card%'
   AND created_at IS NOT NULL AND created_at >= NOW() - INTERVAL '60 days'
   AND store_slug = ANY(${topStores})
   AND (store_slug != ALL(${shopifySlugs}) OR collabs_link IS NOT NULL)
   AND (${hidden.length} = 0 OR store_slug != ALL(${hidden}))
   AND (${excludeIds.length} = 0 OR id != ALL(${excludeIds}))
  ORDER BY created_at DESC, id DESC
  LIMIT ${limit * 3}
 ` as Array<Record<string, unknown>>;

 // Score: store_score + size bonus if user has a size preference and product matches.
 // Cap at limit after sorting.
 const scored = rows.map((p) => {
  const slug = p.store_slug as string;
  const size = (p.size as string | null)?.toUpperCase() ?? null;
  let score = storeScores.get(slug) ?? 0;
  if (useSizes && size && topSizes.includes(size)) {
   score += 5;
  }
  return { p, score };
 });
 scored.sort((a, b) => b.score - a.score);

 const products = scored.slice(0, limit).map((x) => mapRow(x.p));
 return NextResponse.json({ products, personalized: true });
 } catch (err) {
 console.error("[for-you] error:", err);
 return NextResponse.json({ products: [], personalized: false });
 }
}

function mapRow(p: Record<string, unknown>) {
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
}
