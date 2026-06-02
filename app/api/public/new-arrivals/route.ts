import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { formatPrice } from "@/app/lib/formatPrice";
import { SHOPIFY_STORES } from "@/app/lib/storeConfig";
import { HIDDEN_STORE_SLUGS } from "@/app/lib/stores";

export const dynamic = "force-dynamic";

/**
 * Public new-arrivals feed for the mobile app.
 * Sorted by created_at DESC, last 30 days.
 */
export async function GET(request: Request) {
 const { searchParams } = new URL(request.url);
 const limit = Math.min(parseInt(searchParams.get("limit") ?? "80"), 200);

 const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!dbUrl) return NextResponse.json({ products: [] });

 const sql = neon(dbUrl);
 const shopifySlugs = SHOPIFY_STORES.map((s) => s.slug);
 const hidden = ["velvet-archive", ...HIDDEN_STORE_SLUGS];

 try {
 const rows = await sql`
 SELECT id, store_slug, store_name, title, price, currency, image, images
 FROM products
 WHERE image IS NOT NULL AND image != ''
 AND title NOT ILIKE '%gift card%'
 AND created_at IS NOT NULL
 AND created_at >= NOW() - INTERVAL '30 days'
 AND (store_slug != ALL(${shopifySlugs}) OR collabs_link IS NOT NULL)
 AND (${hidden.length} = 0 OR store_slug != ALL(${hidden}))
 ORDER BY created_at DESC, id DESC
 LIMIT ${limit}
 `;

 const products = (rows as Array<Record<string, unknown>>).map((p) => {
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

 return NextResponse.json({ products });
 } catch {
 return NextResponse.json({ products: [] });
 }
}
