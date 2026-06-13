import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { SHOPIFY_STORES } from "@/app/lib/storeConfig";
import { HIDDEN_STORE_SLUGS } from "@/app/lib/stores";
import { inferBrandFromTitle } from "@/app/lib/market-data-db";
import { brands } from "@/app/lib/brandData";

export const dynamic = "force-dynamic";

// Designers (brands) that actually have visible inventory, with counts, for the
// app's designer filter dropdown. Derived from the canonical inferBrandFromTitle
// over live product titles so it matches the designer filter exactly.
const LABEL_TO_SLUG = new Map(brands.map((b) => [b.label, b.slug]));

export async function GET() {
 const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!dbUrl) return NextResponse.json({ brands: [] });

 const sql = neon(dbUrl);
 const shopifySlugs = SHOPIFY_STORES.map((s) => s.slug);
 const hidden = ["velvet-archive", ...HIDDEN_STORE_SLUGS];

 try {
 const rows = (await sql`
  SELECT title FROM products
  WHERE image IS NOT NULL AND image != ''
   AND title NOT ILIKE '%gift card%'
   AND (store_slug != ALL(${shopifySlugs}) OR collabs_link IS NOT NULL)
   AND (${hidden.length} = 0 OR store_slug != ALL(${hidden}))
 `) as Array<{ title: string }>;

 const counts = new Map<string, number>();
 for (const r of rows) {
  const label = inferBrandFromTitle(r.title);
  if (!label) continue;
  const slug = LABEL_TO_SLUG.get(label);
  if (!slug) continue;
  counts.set(slug, (counts.get(slug) ?? 0) + 1);
 }

 const labelBySlug = new Map(brands.map((b) => [b.slug, b.label]));
 const result = [...counts.entries()]
  .map(([slug, count]) => ({ slug, label: labelBySlug.get(slug) ?? slug, count }))
  .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

 return NextResponse.json({ brands: result });
 } catch {
 return NextResponse.json({ brands: [] });
 }
}
