import { NextResponse } from "next/server";
import { getProductById } from "@/app/lib/db";
import { deriveSize } from "@/app/lib/inventory";
import { formatPrice } from "@/app/lib/formatPrice";

export const dynamic = "force-dynamic";

/**
 * Public single-product endpoint for the mobile app.
 * Param: id = composite (e.g. "lei-vintage-42") or numeric DB id
 * Returns null if product is hidden (e.g. Shopify with no collabs_link).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
 const { id: rawId } = await ctx.params;

 // Composite "store-slug-12345" or plain numeric
 const numeric = /^\d+$/.test(rawId) ? parseInt(rawId, 10) : parseInt(rawId.split("-").pop() ?? "", 10);
 if (Number.isNaN(numeric)) {
 return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
 }

 const p = await getProductById(numeric);
 if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

 let images: string[] = [];
 if (p.images) {
 try {
  const parsed = JSON.parse(p.images);
  if (Array.isArray(parsed) && parsed.length > 0) images = parsed;
 } catch {}
 }
 if (images.length === 0 && p.image) images = [p.image];

 return NextResponse.json({
 id: p.id,
 compositeId: `${p.store_slug}-${p.id}`,
 title: p.title,
 description: p.description,
 price: Number(p.price),
 priceFormatted: formatPrice(Number(p.price), p.currency),
 currency: p.currency,
 compareAtPrice: p.compare_at_price != null ? Number(p.compare_at_price) : null,
 image: p.image,
 images,
 size: deriveSize(p),
 brand: p.product_type,
 storeSlug: p.store_slug,
 storeName: p.store_name,
 externalUrl: p.external_url,
 collabsLink: p.collabs_link,
 });
}
