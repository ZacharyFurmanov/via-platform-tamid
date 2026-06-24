import { NextResponse } from "next/server";
import { isApprovedRequest } from "@/app/lib/approval";
import { getProductById } from "@/app/lib/db";
import { deriveSize } from "@/app/lib/inventory";
import { formatPrice } from "@/app/lib/formatPrice";
import { stores } from "@/app/lib/stores";
import { inferBroadCategory } from "@/app/lib/publicFilters";

export const dynamic = "force-dynamic";

/**
 * Public single-product endpoint for the mobile app.
 * Param: id = composite (e.g. "lei-vintage-42") or numeric DB id
 * Returns product details + the store's authenticity / shipping / return
 * policies so the app can render them in accordions.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
 if (!(await isApprovedRequest(request))) return NextResponse.json({ error: "Approval required", needsApproval: true }, { status: 403 });
 const { id: rawId } = await ctx.params;
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

 // Pull store policies if available
 const storeInfo = stores.find((s) => s.slug === p.store_slug);
 const storePolicies = storeInfo
 ? {
  authenticity: (storeInfo as { authenticityPolicy?: string }).authenticityPolicy ?? null,
  shipping: (storeInfo as { shippingPolicy?: string }).shippingPolicy ?? null,
  returns: (storeInfo as { returnPolicy?: string }).returnPolicy ?? null,
 }
 : { authenticity: null, shipping: null, returns: null };

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
 category: inferBroadCategory(p.title ?? ""),
 variantId: p.variant_id,
 storeSlug: p.store_slug,
 storeName: p.store_name,
 storeWebsite: storeInfo?.website ?? null,
 externalUrl: p.external_url,
 collabsLink: p.collabs_link,
 storePolicies,
 });
}
