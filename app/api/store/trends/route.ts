import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { getBrandHeatIndex, getCategoryHeat, getBrandTrend } from "@/app/lib/brand-heat-db";

export const dynamic = "force-dynamic";

// Trend intelligence for a store: marketplace-wide demand momentum (the Brand Heat
// Index) + how the store's OWN inventory brands are trending — to guide sourcing and
// pricing. Aggregate/anonymized: it never exposes any individual store's numbers.
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const [heat, categories] = await Promise.all([
 getBrandHeatIndex(30, 12).catch(() => ({ generatedAt: "", periodDays: 30, brands: [] })),
 getCategoryHeat(30, 8).catch(() => []),
 ]);

 // The store's own inventory brands, and how each is trending on VYA.
 let yourBrands: { brand: string; rank: number; momentumPct: number | null; trending: boolean; note: string }[] = [];
 try {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (url) {
 const sql = neon(url);
 const rows = (await sql`
  SELECT DISTINCT COALESCE(NULLIF(i.brand, ''), '') AS brand
  FROM items i JOIN sellers s ON s.id = i.seller_id
  WHERE s.slug = ${slug} AND i.brand IS NOT NULL AND i.brand <> ''
  LIMIT 24
 `.catch(() => [])) as { brand: string }[];
 const trends = await Promise.all(rows.map((r) => getBrandTrend(r.brand).catch(() => null)));
 yourBrands = trends.filter((t): t is NonNullable<typeof t> => !!t).sort((a, b) => a.rank - b.rank);
 }
 } catch { /* best effort */ }

 return NextResponse.json({
 ok: true,
 generatedAt: heat.generatedAt,
 rising: heat.brands,
 categories,
 yourBrands,
 });
}
