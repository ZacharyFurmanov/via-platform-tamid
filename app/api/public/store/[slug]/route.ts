import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { visibleStores } from "@/app/lib/stores";
import { formatPrice } from "@/app/lib/formatPrice";
import { SHOPIFY_STORES } from "@/app/lib/storeConfig";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
 const { slug } = await ctx.params;
 const storeInfo = visibleStores.find((s) => s.slug === slug);
 if (!storeInfo) {
 return NextResponse.json({ error: "Store not found" }, { status: 404 });
 }

 const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!dbUrl) {
 return NextResponse.json({
  store: {
  slug: storeInfo.slug,
  name: storeInfo.name,
  location: storeInfo.location ?? null,
  image: storeInfo.image ?? null,
  logo: storeInfo.logo ?? null,
  logoBg: (storeInfo as { logoBg?: string }).logoBg ?? "#ffffff",
  description: storeInfo.description ?? null,
  website: storeInfo.website ?? null,
  },
  products: [],
 });
 }

 const sql = neon(dbUrl);
 const shopifySlugs = SHOPIFY_STORES.map((s) => s.slug);

 try {
 const rows = await sql`
 SELECT id, store_slug, store_name, title, price, currency, image, images, created_at
 FROM products
 WHERE store_slug = ${slug}
 AND image IS NOT NULL AND image != ''
 AND title NOT ILIKE '%gift card%'
 AND (store_slug != ALL(${shopifySlugs}) OR collabs_link IS NOT NULL)
 ORDER BY created_at DESC NULLS LAST, id DESC
 LIMIT 500
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

 return NextResponse.json({
 store: {
  slug: storeInfo.slug,
  name: storeInfo.name,
  location: storeInfo.location ?? null,
  image: storeInfo.image ?? null,
  logo: storeInfo.logo ?? null,
  logoBg: (storeInfo as { logoBg?: string }).logoBg ?? "#ffffff",
  description: storeInfo.description ?? null,
  website: storeInfo.website ?? null,
 },
 products,
 });
 } catch {
 return NextResponse.json({
 store: {
  slug: storeInfo.slug,
  name: storeInfo.name,
  location: storeInfo.location ?? null,
  image: storeInfo.image ?? null,
  logo: storeInfo.logo ?? null,
  logoBg: (storeInfo as { logoBg?: string }).logoBg ?? "#ffffff",
  description: storeInfo.description ?? null,
  website: storeInfo.website ?? null,
 },
 products: [],
 });
 }
}
