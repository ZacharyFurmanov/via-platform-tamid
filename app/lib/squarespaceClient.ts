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
  const jsonUrl = shopUrl.replace(/\?.*$/, "") + "?format=json";

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

    // Image URLs — primary asset + gallery sub-items
    const image = item.assetUrl || null;
    const galleryUrls = (item.items || [])
      .map((gi) => gi.assetUrl)
      .filter((url): url is string => !!url);
    const images =
      galleryUrls.length > 0
        ? galleryUrls
        : image
          ? [image]
          : [];

    // Product description (HTML body from Squarespace)
    const description = item.body || item.excerpt || null;

    // Extract size: tags first, then title, then description body
    const size =
      extractSizeFromTags(item.tags || [])
      ?? extractSizeFromText(title)
      ?? extractSizeFromText(description);

    products.push({ title, price, compareAtPrice, image, images, externalUrl, store: storeName, description, size });
  }

  return { products, skippedCount };
}
