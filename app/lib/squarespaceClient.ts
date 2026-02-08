export type SquarespaceProduct = {
  title: string;
  price: number;
  image: string | null;
  images: string[];
  externalUrl: string;
  store: string;
  description: string | null;
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

type SquarespaceItem = {
  title?: string;
  fullUrl?: string;
  urlId?: string;
  assetUrl?: string;
  variants?: SquarespaceVariant[];
  tags?: string[];
  body?: string;
  excerpt?: string;
};

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
  const jsonUrl = shopUrl.replace(/\?.*$/, "") + "?format=json";

  const response = await fetch(jsonUrl, {
    headers: {
      "User-Agent": "VIA-Sync/1.0",
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
  const products: SquarespaceProduct[] = [];
  let skippedCount = 0;

  // Derive base URL from the shop URL (e.g., "https://www.leivintage.com")
  const baseUrl = new URL(shopUrl).origin;

  for (const item of items) {
    const title = item.title?.trim();
    if (!title) continue;

    // Get price from first variant (Squarespace stores prices in cents)
    const variant = item.variants?.[0];
    if (!variant) continue;

    const price = (variant.onSale ? variant.salePrice : variant.price) / 100;
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

    // Image URL
    const image = item.assetUrl || null;
    const images = image ? [image] : [];

    // Product description (HTML body from Squarespace)
    const description = item.body || item.excerpt || null;

    products.push({ title, price, image, images, externalUrl, store: storeName, description });
  }

  return { products, skippedCount };
}
