export type SquarespaceProduct = {
 title: string;
 price: number;
 compareAtPrice: number | null;
 image: string | null;
 images: string[];
 externalUrl: string;
 store: string;
 description: string | null;
 size: string | null;
};

export type SquarespaceResult = {
 products: SquarespaceProduct[];
 skippedCount: number;
};

type SquarespaceVariant = {
 price: number;
 salePrice: number;
 onSale: boolean;
 unlimited: boolean;
 qtyInStock: number;
};

type SquarespaceGalleryItem = {
 assetUrl?: string;
};

type SquarespaceItem = {
 title?: string;
 fullUrl?: string;
 urlId?: string;
 assetUrl?: string;
 items?: SquarespaceGalleryItem[];
 variants?: SquarespaceVariant[];
 tags?: string[];
 body?: string;
 excerpt?: string;
};

const SS_SIZE_VALUE = `(?:US|UK|EU|IT)?\\s*\\d[\\d.]*|XS|S|M|L|XL|XXL|2XL|3XL|XXXL|OS|OSFM|One\\s+Size`;

/** Extract size from Squarespace tags (e.g. "size-m", "xl", "us-8") */
function extractSizeFromTags(tags: string[]): string | null {
 for (const tag of tags) {
 const t = tag.trim();
 // "size-m", "size:xl", "size 38"
 const tagMatch = /^size[-:\s](.+)$/i.exec(t);
 if (tagMatch) return tagMatch[1].trim().toUpperCase();
 // Bare letter sizes
 if (/^(xs|s|m|l|xl|xxl|2xl|3xl|xxxl|os|osfm)$/i.test(t)) return t.toUpperCase();
 }
 return null;
}

/** Extract size from title or description text */
function extractSizeFromText(text: string | null): string | null {
 if (!text) return null;
 const plain = text.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
 // Parenthesized: "(Size M)"
 const parenMatch = /\(\s*(?:size|sz)\s*:?\s*([^)]+)\)/i.exec(plain);
 if (parenMatch) return parenMatch[1].trim();
 // "Size: M", "Tagged size: 38", "Size M" at end, etc.
 const re = new RegExp(
 `(?:tagged\\s+size|labeled\\s+size|marked\\s+size|size)\\s*:?\\s*(${SS_SIZE_VALUE})`,
 "i"
 );
 const match = re.exec(plain);
 if (match) return match[1].trim();
 return null;
}

/**
 * Checks if a product appears to be sold out based on title or tags
 */
function isSoldOut(item: SquarespaceItem): boolean {
 const title = (item.title || "").toLowerCase();
 const tags = (item.tags || []).map((t) => t.toLowerCase());

 const soldPatterns = [
 /\bsold\b/,
 /\bsold\s*out\b/,
 /\bout\s*of\s*stock\b/,
 /\bunavailable\b/,
 /\bno\s*longer\s*available\b/,
 /\[sold\]/,
 /\(sold\)/,
 ];

 if (soldPatterns.some((p) => p.test(title))) return true;
 if (tags.some((t) => soldPatterns.some((p) => p.test(t)))) return true;

 // Check variant stock — if all variants have 0 stock and aren't unlimited
 const variants = item.variants || [];
 if (
 variants.length > 0 &&
 variants.every((v) => !v.unlimited && v.qtyInStock === 0)
 ) {
 return true;
 }

 return false;
}

/**
 * Fetches and parses products from a Squarespace store's JSON API.
 * Uses the ?format=json endpoint which includes commerce data (prices, stock).
 * @param shopUrl - The store's shop page URL (e.g., "https://www.leivintage.com/shop")
 * @param storeName - The store name to tag products with
 */
export async function parseSquarespaceJSON(
 shopUrl: string,
 storeName: string
): Promise<SquarespaceResult> {
 const baseJsonUrl = shopUrl.replace(/\?.*$/, "") + "?format=json";
 const products: SquarespaceProduct[] = [];
 let skippedCount = 0;

 // Derive base URL from the shop URL (e.g., "https://www.leivintage.com")
 const baseUrl = new URL(shopUrl).origin;

 // Squarespace returns all items from the offset onwards, but caps each
 // response at ~120 items. Paginate by setting offset = total items received
 // so far, until we get an empty response.
 const seenTitles = new Set<string>();
 let offset = 0;
 let totalFetched = 0;

 while (true) {
 const jsonUrl = offset === 0 ? baseJsonUrl : `${baseJsonUrl}&offset=${offset}`;

 const response = await fetch(jsonUrl, {
 headers: {
 "User-Agent": "VYA-Sync/1.0",
 Accept: "application/json",
 },
 });

 if (!response.ok) {
 throw new Error(
 `Failed to fetch Squarespace JSON: ${response.status} ${response.statusText}`
 );
 }

 const data = await response.json();
 const items: SquarespaceItem[] = data.items || [];

 if (items.length === 0) break;

 totalFetched += items.length;
 // Deduplicate across pages (Squarespace may overlap on page boundaries)
 let newItemsOnPage = 0;

 for (const item of items) {
 const title = item.title?.trim();
 if (!title) continue;
 if (seenTitles.has(title)) continue;
 seenTitles.add(title);
 newItemsOnPage++;

 // Get price from first variant (Squarespace stores prices in cents)
 const variant = item.variants?.[0];
 if (!variant) continue;

 const price = (variant.onSale ? variant.salePrice : variant.price) / 100;
 const compareAtPrice = variant.onSale ? variant.price / 100 : null;
 if (price <= 0) continue;

 // Skip sold-out items
 if (isSoldOut(item)) {
 skippedCount++;
 continue;
 }

 // Build full URL
 const path = item.fullUrl || (item.urlId ? `/shop/p/${item.urlId}` : null);
 if (!path) continue;
 const externalUrl = path.startsWith("http") ? path : `${baseUrl}${path}`;

 // Image URLs — gallery sub-items (items[].assetUrl) are proper image URLs.
 // item.assetUrl can be a non-image container URL on some Squarespace stores,
 // so always prefer gallery images and only fall back to assetUrl if empty.
 const galleryUrls = (item.items || [])
 .map((gi: { assetUrl?: string }) => gi.assetUrl)
 .filter((url): url is string => !!url);
 const fallbackAsset = (item.assetUrl && /\.(jpe?g|png|gif|webp)/i.test(item.assetUrl))
 ? item.assetUrl
 : null;
 const images = galleryUrls.length > 0 ? galleryUrls : (fallbackAsset ? [fallbackAsset] : []);
 const image = images[0] || null;

 // Product description (HTML body from Squarespace)
 const description = item.body || item.excerpt || null;

 // Extract size: tags first, then title, then description body
 const size =
 extractSizeFromTags(item.tags || [])
 ?? extractSizeFromText(title)
 ?? extractSizeFromText(description);

 products.push({ title, price, compareAtPrice, image, images, externalUrl, store: storeName, description, size });
 }

 // If this page had no new items, we've reached the end
 if (newItemsOnPage === 0) break;

 // Advance offset to fetch items beyond what we've received so far
 offset = totalFetched;
 }

 return { products, skippedCount };
}
