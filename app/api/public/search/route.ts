import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { formatPrice } from "@/app/lib/formatPrice";
import { SHOPIFY_STORES } from "@/app/lib/storeConfig";
import { HIDDEN_STORE_SLUGS } from "@/app/lib/stores";

export const dynamic = "force-dynamic";

/**
 * Public product search for the mobile app.
 * Simple title-based search, no auth required.
 */
export async function GET(request: Request) {
 const { searchParams } = new URL(request.url);
 const q = (searchParams.get("q") ?? "").trim();
 const limit = Math.min(parseInt(searchParams.get("limit") ?? "60"), 200);

 const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!dbUrl) return NextResponse.json({ products: [] });

 const sql = neon(dbUrl);
 const shopifySlugs = SHOPIFY_STORES.map((s) => s.slug);
 const hidden = ["velvet-archive", ...HIDDEN_STORE_SLUGS];

 try {
 const rows = q
  ? await sql`
   SELECT id, store_slug, store_name, title, price, currency, image, images
   FROM products
   WHERE image IS NOT NULL AND image != ''
   AND title NOT ILIKE '%gift card%'
   AND title ILIKE ${"%" + q + "%"}
   AND (store_slug != ALL(${shopifySlugs}) OR collabs_link IS NOT NULL)
   AND (${hidden.length} = 0 OR store_slug != ALL(${hidden}))
   ORDER BY id DESC
   LIMIT ${limit}
  `
  : await sql`
   SELECT id, store_slug, store_name, title, price, currency, image, images
   FROM products
   WHERE image IS NOT NULL AND image != ''
   AND title NOT ILIKE '%gift card%'
   AND (store_slug != ALL(${shopifySlugs}) OR collabs_link IS NOT NULL)
   AND (${hidden.length} = 0 OR store_slug != ALL(${hidden}))
   ORDER BY id DESC
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
