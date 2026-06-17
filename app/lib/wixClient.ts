export type WixProduct = {
 title: string;
 price: number;
 compareAtPrice: number | null;
 image: string | null;
 images: string[];
 externalUrl: string;
 description: string | null;
 size: string | null;
 variantId: string | null;
};

export type WixResult = {
 products: WixProduct[];
 skippedCount: number;
};

const WIX_API_BASE = "https://www.wixapis.com/stores/v1";
const WIX_ECOM_ORDERS_URL = "https://www.wixapis.com/ecom/v1/orders/search";

export type WixOrder = {
 id: string;
 number: string | number | null;
 createdDate: string;
 total: number;
 currency: string;
 email: string | null;
 items: { productName: string; quantity: number; price: number }[];
};

// Fetch recent eCommerce orders for a Wix store. Field paths verified against the
// Wix Search Orders API (orders[].id / .priceSummary.total.amount / .currency /
// .buyerInfo.email / .lineItems[].productName.original|.quantity|.price.amount).
// Returns only orders with a positive total. The API already excludes
// status:"INITIALIZED". Paged via cursorPaging; capped to avoid runaway loops.
export async function fetchWixOrders(siteId: string, apiKey: string, sinceISO: string): Promise<WixOrder[]> {
 const orders: WixOrder[] = [];
 let cursor: string | null = null;
 for (let page = 0; page < 50; page++) {
 const body = cursor
 ? { search: { cursorPaging: { cursor } } }
 : { search: { filter: { createdDate: { $gte: sinceISO } }, cursorPaging: { limit: 100 } } };

 const res = await fetch(WIX_ECOM_ORDERS_URL, {
 method: "POST",
 headers: {
 Authorization: apiKey,
 "wix-site-id": siteId,
 "Content-Type": "application/json",
 },
 body: JSON.stringify(body),
 signal: AbortSignal.timeout(30_000),
 });

 if (!res.ok) {
 const text = await res.text().catch(() => "");
 throw new Error(`Wix orders API ${res.status}: ${text.slice(0, 200)}`);
 }

 type RawWixOrder = {
 id: string;
 number?: string | number | null;
 createdDate?: string;
 currency?: string;
 priceSummary?: { total?: { amount?: string } };
 buyerInfo?: { email?: string | null };
 lineItems?: Array<{ productName?: { original?: string }; quantity?: number | string; price?: { amount?: string } }>;
 };
 const data = (await res.json()) as {
 orders?: RawWixOrder[];
 metadata?: { cursors?: { next?: string | null } };
 pagingMetadata?: { cursors?: { next?: string | null } };
 };

 const pageOrders = data.orders ?? [];
 for (const o of pageOrders) {
 const total = parseFloat(o.priceSummary?.total?.amount ?? "0");
 if (!(total > 0)) continue;
 orders.push({
 id: String(o.id),
 number: o.number ?? null,
 createdDate: o.createdDate ?? new Date().toISOString(),
 total,
 currency: o.currency ?? "USD",
 email: o.buyerInfo?.email ?? null,
 items: (o.lineItems ?? []).map((li) => ({
 productName: li.productName?.original ?? "Item",
 quantity: Number(li.quantity ?? 1),
 price: parseFloat(li.price?.amount ?? "0"),
 })),
 });
 }

 cursor = data.metadata?.cursors?.next ?? data.pagingMetadata?.cursors?.next ?? null;
 if (!cursor || pageOrders.length === 0) break;
 }
 return orders;
}

export async function fetchWixProducts(
 siteId: string,
 apiKey: string,
 storeName: string,
 websiteUrl: string,
): Promise<WixResult> {
 const PAGE_SIZE = 100;
 const allProducts: WixProduct[] = [];
 let offset = 0;
 let total = Infinity;
 let skippedCount = 0;

 while (offset < total) {
 const res = await fetch(`${WIX_API_BASE}/products/query`, {
 method: "POST",
 headers: {
 Authorization: apiKey,
 "wix-site-id": siteId,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 query: {
 filter: JSON.stringify({ visible: true }),
 paging: { limit: PAGE_SIZE, offset },
 },
 includeVariants: true,
 }),
 signal: AbortSignal.timeout(30_000),
 });

 if (!res.ok) {
 const body = await res.text().catch(() => "");
 throw new Error(`Wix API ${res.status} for ${storeName}: ${body.slice(0, 200)}`);
 }

 const data = (await res.json()) as {
 products?: any[];
 metadata?: { count: number; offset: number; total: number };
 };

 total = data.metadata?.total ?? 0;
 const page = data.products ?? [];

 for (const p of page) {
 if (p.stock?.inStock === false) {
 skippedCount++;
 continue;
 }

 const rawPrice = parseFloat(p.priceData?.price ?? p.price?.price ?? "0");
 const rawDiscounted = parseFloat(p.priceData?.discountedPrice ?? p.price?.discountedPrice ?? String(rawPrice));
 const actualPrice = rawDiscounted > 0 ? rawDiscounted : rawPrice;

 if (!actualPrice || actualPrice <= 0) {
 skippedCount++;
 continue;
 }

 const compareAtPrice = rawPrice > rawDiscounted + 0.01 ? rawPrice : null;

 // Images
 const mainUrl: string | null = p.media?.mainMedia?.image?.url ?? null;
 const additionalUrls: string[] = (p.media?.items ?? [])
 .map((item: any) => item.image?.url as string | undefined)
 .filter((u: string | undefined): u is string => Boolean(u));
 const images = mainUrl
 ? [mainUrl, ...additionalUrls.filter((u) => u !== mainUrl)]
 : additionalUrls;

 // Product page URL
 const productPath = p.productPageUrl?.path ?? `/product-page/${p.slug ?? p.id}`;
 const base = (p.productPageUrl?.base ?? websiteUrl).replace(/\/$/, "");
 const externalUrl = `${base}${productPath}`;

 // Size and variant from first in-stock variant
 let size: string | null = null;
 let variantId: string | null = null;
 if (Array.isArray(p.variants) && p.variants.length > 0) {
 const picked =
 p.variants.find((v: any) => v.stock?.inStock !== false) ?? p.variants[0];
 variantId = picked.id ?? null;
 const choices: Record<string, string> = picked.choices ?? {};
 size =
 choices["Size"] ?? choices["size"] ?? choices["SIZE"] ??
 Object.values(choices)[0] ?? null;
 }

 allProducts.push({
 title: p.name,
 price: actualPrice,
 compareAtPrice,
 image: images[0] ?? null,
 images,
 externalUrl,
 description: p.description ?? null,
 size,
 variantId,
 });
 }

 offset += page.length;
 if (page.length === 0) break;
 }

 console.log(`[wixClient] ${storeName}: ${allProducts.length} products, ${skippedCount} skipped`);
 return { products: allProducts, skippedCount };
}
