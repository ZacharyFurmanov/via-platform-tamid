import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/app/lib/collections-config";
import { getAllEditorsPicks } from "@/app/lib/editors-picks-db";
import { formatPrice } from "@/app/lib/formatPrice";
import { parseFilters, applyJsFilters, stripSizePrefix } from "@/app/lib/publicFilters";
import { getCategoryOverrideMap } from "@/app/lib/category-overrides-db";
import { expandSizeKeys } from "@/app/lib/inventory";

export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
 const { slug } = await ctx.params;
 const { searchParams } = new URL(request.url);
 const filters = parseFilters(searchParams);

 const collectionInfo = COLLECTIONS.find((c) => c.slug === slug);
 if (!collectionInfo) {
 return NextResponse.json({ error: "Collection not found" }, { status: 404 });
 }

 const collection = {
 slug: collectionInfo.slug,
 name: collectionInfo.name,
 curatedBy: collectionInfo.curatedBy,
 description: collectionInfo.description,
 };

 try {
 const picks = await getAllEditorsPicks(slug);

 let products = picks.map((pick) => {
 const p = pick.product;
 let parsedImages: string[] | undefined;
 try {
  parsedImages = p.images ? JSON.parse(p.images) : undefined;
 } catch {}
 return {
  id: p.id,
  name: p.title,
  storeSlug: p.storeSlug,
  storeName: p.storeName,
  price: formatPrice(p.price, p.currency),
  priceNum: p.price,
  size: p.size,
  image: p.image,
  images: parsedImages,
 };
 });

 // Apply filters in JS (collections are typically small enough for this).
 // A ranged size ("US 2-4") matches a filter for any size it covers.
 if (filters.sizes.length > 0) {
 const wanted = filters.sizes.map(stripSizePrefix);
 products = products.filter((p) => p.size && expandSizeKeys(p.size).some((k) => wanted.includes(k)));
 }
 if (filters.priceMin != null) products = products.filter((p) => p.priceNum >= filters.priceMin!);
 if (filters.priceMax != null) products = products.filter((p) => p.priceNum <= filters.priceMax!);
 if (filters.stores.length > 0) products = products.filter((p) => filters.stores.includes(p.storeSlug));

 products = applyJsFilters(products, filters, await getCategoryOverrideMap());

 if (filters.sort === "priceAsc") {
 products = products.slice().sort((a, b) => a.priceNum - b.priceNum);
 } else if (filters.sort === "priceDesc") {
 products = products.slice().sort((a, b) => b.priceNum - a.priceNum);
 }

 // Strip the helper priceNum we used for sorting
 const out = products.map(({ priceNum: _omit, size: _omitSize, ...rest }) => rest);

 return NextResponse.json({ collection, products: out });
 } catch {
 return NextResponse.json({ collection, products: [] });
 }
}
