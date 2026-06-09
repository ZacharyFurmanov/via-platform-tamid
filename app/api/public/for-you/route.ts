import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { formatPrice } from "@/app/lib/formatPrice";
import { SHOPIFY_STORES } from "@/app/lib/storeConfig";
import { HIDDEN_STORE_SLUGS } from "@/app/lib/stores";
import { getMobileUserId } from "@/app/lib/mobileAuth";
import { getUserTaste } from "@/app/lib/taste-db";
import { vibeKeywords } from "@/app/lib/tasteVibes";

export const dynamic = "force-dynamic";

/**
 * Personalized "Curated for You" feed for the mobile home screen.
 *
 * Signal model (scored):
 *   click = 5 (90d), favorite = 8 (all-time), view = 1 (60d)
 * Aggregated into per-user top stores + top sizes. Returns recent products from
 * those stores, then ALWAYS backfills with a popular+recent blend so the feed is
 * full even for users with little/no history (and sharpens as they interact).
 *
 * `personalized` is true when the user had real activity driving the ranking.
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

 // Popular + recent blend, excluding given product ids. Used as the no-signal
 // feed and as backfill so "Curated for You" is never sparse. When vibePatterns
 // are supplied (from the taste test), results are restricted to titles matching
 // those keywords — this is what makes a brand-new user's feed personalized.
 const popularRecent = async (excludeIds: number[], take: number, vibePatterns: string[] = []) => {
 if (take <= 0) return [] as Array<Record<string, unknown>>;
 return (await sql`
  SELECT p.id, p.store_slug, p.store_name, p.title, p.price, p.currency, p.image, p.images,
   COALESCE(f.cnt, 0) AS fav_count
  FROM products p
  LEFT JOIN (
   SELECT product_id, COUNT(*)::int AS cnt FROM product_favorites GROUP BY product_id
  ) f ON f.product_id = p.id
  WHERE p.image IS NOT NULL AND p.image != ''
   AND p.title NOT ILIKE '%gift card%'
   AND (p.store_slug != ALL(${shopifySlugs}) OR p.collabs_link IS NOT NULL)
   AND (${hidden.length} = 0 OR p.store_slug != ALL(${hidden}))
   AND (${excludeIds.length} = 0 OR p.id != ALL(${excludeIds}))
   AND (${vibePatterns.length} = 0 OR lower(p.title) LIKE ANY(${vibePatterns}::text[]))
  ORDER BY COALESCE(f.cnt, 0) DESC, p.created_at DESC NULLS LAST, p.id DESC
  LIMIT ${take}
 `) as Array<Record<string, unknown>>;
 };

 // Taste-test vibes (cold-start personalization signal).
 const vibes = userId ? await getUserTaste(userId).catch(() => [] as string[]) : [];
 const vibePatterns = vibeKeywords(vibes).map((k) => `%${k}%`);
 const hasVibes = vibePatterns.length > 0;

 try {
 // No user → curated popular + recent (still labeled "Curated for You" in the app).
 if (!userId) {
 const rows = await popularRecent([], limit);
 return NextResponse.json({ products: rows.map(mapRow), personalized: false });
 }

 // ============ Build signal profile ============
 const signalRows = (await sql`
  WITH activity AS (
   SELECT c.product_id::int AS product_id, c.store_slug, 5 AS weight
   FROM clicks c
   WHERE c.user_id = ${userId} AND c.timestamp >= NOW() - INTERVAL '90 days' AND c.store_slug IS NOT NULL
   UNION ALL
   SELECT pf.product_id::int AS product_id, NULL AS store_slug, 8 AS weight
   FROM product_favorites pf WHERE pf.user_id = ${userId}
   UNION ALL
   SELECT pv.product_id::int AS product_id, NULL AS store_slug, 1 AS weight
   FROM product_views pv WHERE pv.user_id = ${userId} AND pv.timestamp >= NOW() - INTERVAL '60 days'
  )
  SELECT COALESCE(a.store_slug, p.store_slug) AS store_slug, p.size, SUM(a.weight)::int AS score
  FROM activity a
  LEFT JOIN products p ON p.id = a.product_id
  WHERE COALESCE(a.store_slug, p.store_slug) IS NOT NULL
  GROUP BY 1, 2
 `) as Array<{ store_slug: string; size: string | null; score: number }>;

 // No behavioral history yet. If they took the taste test, personalize off their
 // vibes; otherwise fall back to a generic popular+recent mix.
 if (signalRows.length === 0) {
 let rows = await popularRecent([], limit, vibePatterns);
 if (hasVibes && rows.length < limit) {
  const have = rows.map((r) => r.id as number);
  const fill = await popularRecent(have, limit - rows.length);
  rows = rows.concat(fill);
 }
 return NextResponse.json({ products: rows.map(mapRow), personalized: hasVibes });
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

 const topStores = Array.from(storeScores.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([slug]) => slug);
 const topSizes = Array.from(sizeScores.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s]) => s);

 // Exclude products already favorited or viewed (surface fresh discoveries)
 const seenRows = (await sql`
  SELECT product_id::int AS pid FROM product_favorites WHERE user_id = ${userId}
  UNION
  SELECT product_id::int AS pid FROM product_views WHERE user_id = ${userId}
 `) as Array<{ pid: number }>;
 const excludeIds = seenRows.map((r) => r.pid);
 const useSizes = topSizes.length > 0;

 const rows = (await sql`
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
 `) as Array<Record<string, unknown>>;

 // Score: store affinity + size bonus + taste-vibe bonus.
 const vibeKw = vibeKeywords(vibes);
 const scored = rows.map((p) => {
 const slug = p.store_slug as string;
 const size = (p.size as string | null)?.toUpperCase() ?? null;
 let score = storeScores.get(slug) ?? 0;
 if (useSizes && size && topSizes.includes(size)) score += 5;
 if (vibeKw.length > 0) {
  const title = String(p.title ?? "").toLowerCase();
  if (vibeKw.some((kw) => title.includes(kw))) score += 4;
 }
 return { p, score };
 });
 scored.sort((a, b) => b.score - a.score);

 let products = scored.slice(0, limit).map((x) => mapRow(x.p));

 // Always fill to `limit` with a popular+recent blend so the feed is never sparse.
 if (products.length < limit) {
 const exclude = Array.from(new Set([...excludeIds, ...products.map((p) => p.id)]));
 const fill = await popularRecent(exclude, limit - products.length);
 products = products.concat(fill.map(mapRow));
 }

 return NextResponse.json({ products, personalized: true });
 } catch (err) {
 console.error("[for-you] error:", err);
 // Best-effort fallback so the home screen still populates.
 try {
  const rows = await popularRecent([], limit);
  return NextResponse.json({ products: rows.map(mapRow), personalized: false });
 } catch {
  return NextResponse.json({ products: [], personalized: false });
 }
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
