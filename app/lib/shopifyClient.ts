/**
 * Shopify Storefront API Client
 *
 * Fetches products from any Shopify store using their public Storefront API.
 * Requires:
 * - storeDomain: The Shopify store domain (e.g., "mystore.myshopify.com" or custom domain)
 * - storefrontAccessToken: Public Storefront API access token
 */

export type ShopifyProduct = {
  title: string;
  price: number | null;
  compareAtPrice: number | null;
  currency: string;
  image: string | null;
  images: string[];
  externalUrl: string;
  store: string;
  vendor: string | null;
  productType: string | null;
  availableForSale: boolean;
  description: string | null;
  variantId: string | null;
  shopifyProductId: string | null;
  size: string | null;
};

export type ShopifyFetchResult = {
  products: ShopifyProduct[];
  skippedCount: number;
};

type ShopifyImageNode = {
  url: string;
  altText: string | null;
};

type ShopifyPriceV2 = {
  amount: string;
  currencyCode: string;
};

type ShopifyVariantNode = {
  id: string;
  priceV2: ShopifyPriceV2;
  compareAtPriceV2: ShopifyPriceV2 | null;
  availableForSale: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
};

type ShopifyProductNode = {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  availableForSale: boolean;
  totalInventory: number;
  priceRange: {
    minVariantPrice: ShopifyPriceV2;
  };
  images: {
    edges: Array<{ node: ShopifyImageNode }>;
  };
  variants: {
    edges: Array<{ node: ShopifyVariantNode }>;
  };
};

type ShopifyProductsResponse = {
  data?: {
    products: {
      edges: Array<{ node: ShopifyProductNode; cursor: string }>;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
  errors?: Array<{ message: string }>;
};

// GraphQL query for fetching products
const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
          descriptionHtml
          vendor
          productType
          availableForSale
          totalInventory
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 10) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                priceV2 {
                  amount
                  currencyCode
                }
                compareAtPriceV2 {
                  amount
                  currencyCode
                }
                availableForSale
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const SIZE_VALUE_PATTERN = `(?:US|UK|EU|IT)?\\s*\\d[\\d.]*|XS|S|M|L|XL|XXL|2XL|3XL|XXXL|OS|OSFM|One\\s+Size`;
// Matches sizes that are ONLY generic clothing letters (not numeric, not EU/UK etc.)
const GENERIC_CLOTHING_SIZE = /^(XS|S|M|L|XL|XXL|2XL|3XL|XXXL|OS|OSFM|One\s+Size)$/i;
// Full-string size validator — used to reject color/other values stored as size
const SIZE_VALUE_REGEX = new RegExp(`^(${SIZE_VALUE_PATTERN})$`, "i");
// Exported so other modules can validate DB-stored sizes (e.g. reject "Gold", "Black")
export function isValidSizeValue(val: string): boolean {
  return SIZE_VALUE_REGEX.test(val.trim());
}

/**
 * Extracts a size from a product title as a fallback when no variant size option exists.
 * Matches patterns like "Size M", "Size 38", "/ Size 9.5", "- Size US 8", "(Size L)"
 * Also matches bare trailing numbers common in vintage listings: "Dior Heels 35", "Gucci Slides 40.5"
 */
export function extractSizeFromTitle(title: string): string | null {
  const parenMatch = /\(\s*(?:size|sz)\s*:?\s*([^)]+)\)/i.exec(title);
  if (parenMatch) return parenMatch[1].trim();

  // Match bare size in parentheses: "(S)", "(M)", "(38)", "(EU 38)"
  const bareParenRe = new RegExp(`\\(\\s*(${SIZE_VALUE_PATTERN})\\s*\\)`, "i");
  const bareParenMatch = bareParenRe.exec(title);
  if (bareParenMatch && SIZE_VALUE_REGEX.test(bareParenMatch[1].trim())) return bareParenMatch[1].trim();

  const re = new RegExp(`(?:[-–—|\\/,]\\s*|\\s+)(?:size|sz)\\s*:?\\s*(${SIZE_VALUE_PATTERN})`, "i");
  const sepMatch = re.exec(title);
  if (sepMatch) return sepMatch[1].trim();

  // Match a bare size at the very end of the title (no "size" keyword needed).
  // Handles "Dior Heels 35", "Jimmy Choo Pumps 40.5", "Loafers EU 38".
  // Capped at 50 to exclude years (2024, 2025) and other large numbers.
  const trailingRe = new RegExp(`\\s((?:US|UK|EU|IT)\\s*\\d[\\d.]*|\\d{1,2}(?:\\.\\d)?)$`);
  const trailingMatch = trailingRe.exec(title);
  if (trailingMatch) {
    const val = trailingMatch[1].trim();
    const num = parseFloat(val.replace(/[^\d.]/g, ""));
    if (SIZE_VALUE_REGEX.test(val) && num >= 1 && num <= 50) return val;
  }

  return null;
}

/**
 * Extracts a size from product description HTML.
 * Handles patterns like "Size: M", "Size M", "Tagged size: 38", "Labeled size S"
 */
function extractSizeFromDescription(description: string | null): string | null {
  if (!description) return null;
  // Strip HTML tags and decode common entities
  const text = description.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
  // Matches "Size: M", "Tagged size: 38", "Label: EU 37", etc.
  const re = new RegExp(`(?:tagged\\s+size|labeled\\s+size|marked\\s+size|label(?:\\s+size)?|size)\\s*:?\\s*(${SIZE_VALUE_PATTERN})`, "i");
  const match = re.exec(text);
  if (match) return match[1].trim();
  // Fallback: "fits XS", "fits XS-M", "best fits M" — common in vintage descriptions
  const fitsRe = new RegExp(`(?:best\\s+)?fits?\\s+(${SIZE_VALUE_PATTERN})`, "i");
  const fitsMatch = fitsRe.exec(text);
  if (fitsMatch) return fitsMatch[1].trim();
  return null;
}

/**
 * Normalizes a Shopify store domain to the correct format
 * Handles custom domains and .myshopify.com domains
 */
function normalizeStoreDomain(domain: string): string {
  // Remove protocol if present
  let normalized = domain.replace(/^https?:\/\//, "");
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, "");
  return normalized;
}

/**
 * Constructs the product URL on the Shopify store
 */
function getProductUrl(storeDomain: string, handle: string): string {
  return `https://${storeDomain}/products/${handle}`;
}

/**
 * Fetches products from a Shopify store using the Storefront API
 * Filters out sold-out products using CONSERVATIVE logic.
 *
 * CONSERVATIVE APPROACH: Only skip products that are DEFINITELY sold out.
 * - availableForSale must be explicitly false
 * - If totalInventory is 0 but availableForSale is true, include it (may allow overselling)
 * - If data is unclear, include the product
 *
 * @param storeDomain - The Shopify store domain (e.g., "mystore.myshopify.com")
 * @param storefrontAccessToken - The Storefront API access token
 * @param storeName - Display name for the store
 * @param maxProducts - Maximum number of products to fetch (default: 250)
 * @returns Object with products array and skipped count
 */
export async function fetchShopifyProducts(
  storeDomain: string,
  storefrontAccessToken: string,
  storeName: string,
  maxProducts: number = 250
): Promise<ShopifyFetchResult> {
  const normalizedDomain = normalizeStoreDomain(storeDomain);
  const endpoint = `https://${normalizedDomain}/api/2024-01/graphql.json`;

  const products: ShopifyProduct[] = [];
  let skippedCount = 0;
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage && products.length < maxProducts) {
    const batchSize = Math.min(50, maxProducts - products.length);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
      },
      body: JSON.stringify({
        query: PRODUCTS_QUERY,
        variables: {
          first: batchSize,
          after: cursor,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Shopify API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data: ShopifyProductsResponse = await response.json();

    if (data.errors && data.errors.length > 0) {
      throw new Error(
        `Shopify API errors: ${data.errors.map((e) => e.message).join(", ")}`
      );
    }

    if (!data.data?.products) {
      throw new Error("Invalid response from Shopify API");
    }

    const productEdges = data.data.products.edges;

    for (const { node } of productEdges) {
      // CONSERVATIVE: Only skip if availableForSale is explicitly false
      // Don't rely on totalInventory alone - some stores don't track inventory
      // or allow overselling
      if (node.availableForSale === false) {
        console.log(`[Shopify API] Skipping "${node.title}" - availableForSale is false`);
        skippedCount++;
        continue;
      }

      const price = parseFloat(node.priceRange.minVariantPrice.amount);
      const currency = node.priceRange.minVariantPrice.currencyCode;
      const allImageUrls = node.images.edges.map((e) => e.node.url);
      const imageUrl = allImageUrls[0] || null;

      // Extract numeric IDs from GIDs (e.g. "gid://shopify/Product/12345" -> "12345")
      const productId = node.id?.match(/(\d+)$/)?.[1] ?? null;
      const firstVariant = node.variants?.edges?.[0]?.node;
      const variantGid = firstVariant?.id;
      const variantId = variantGid?.match(/(\d+)$/)?.[1] ?? null;

      // Compare-at price (original price when on sale)
      const compareAtRaw = firstVariant?.compareAtPriceV2?.amount;
      const compareAtPrice = compareAtRaw ? parseFloat(compareAtRaw) : null;
      const effectiveCompareAt = compareAtPrice && compareAtPrice > price ? compareAtPrice : null;

      // Extract size from variant options (look for "Size", "Shoe size", etc.)
      // Validate with SIZE_VALUE_REGEX to reject non-size values like "ANIMAL", "Black", etc.
      const sizeOption = firstVariant?.selectedOptions?.find(
        (opt) => /size/i.test(opt.name)
      );
      const sizeOptionRaw = sizeOption?.value && sizeOption.value !== "Default Title" ? sizeOption.value : null;
      const sizeFromVariant = sizeOptionRaw && SIZE_VALUE_REGEX.test(sizeOptionRaw.trim()) ? sizeOptionRaw : null;
      const sizeFromTitle = extractSizeFromTitle(node.title);
      const sizeFromDescription = extractSizeFromDescription(node.descriptionHtml || null);
      // If sizeFromVariant is only a generic clothing letter (S/M/L/XL…), it may be wrong
      // for accessories/shoes. Prefer the more specific description/title size when available.
      const isGenericOnly = !!sizeFromVariant && GENERIC_CLOTHING_SIZE.test(sizeFromVariant);
      const specificSize = sizeFromDescription ?? sizeFromTitle;
      const size = (sizeFromVariant && !isGenericOnly)
        ? sizeFromVariant
        : specificSize ?? (isGenericOnly ? sizeFromVariant : null);

      products.push({
        title: node.title,
        price: isNaN(price) ? null : price,
        compareAtPrice: effectiveCompareAt,
        currency,
        image: imageUrl,
        images: allImageUrls,
        externalUrl: getProductUrl(normalizedDomain, node.handle),
        store: storeName,
        vendor: node.vendor || null,
        productType: node.productType || null,
        availableForSale: node.availableForSale,
        description: node.descriptionHtml || null,
        variantId,
        shopifyProductId: productId,
        size,
      });
    }

    hasNextPage = data.data.products.pageInfo.hasNextPage;
    cursor = data.data.products.pageInfo.endCursor;
  }

  console.log(`[Shopify API] ${storeName}: ${products.length} synced, ${skippedCount} skipped (sold out)`);
  return { products, skippedCount };
}

/**
 * Tests the connection to a Shopify store
 * Returns basic store info if successful
 */
export async function testShopifyConnection(
  storeDomain: string,
  storefrontAccessToken: string
): Promise<{ success: boolean; shopName?: string; error?: string }> {
  const normalizedDomain = normalizeStoreDomain(storeDomain);
  const endpoint = `https://${normalizedDomain}/api/2024-01/graphql.json`;

  const query = `
    query {
      shop {
        name
        primaryDomain {
          url
        }
      }
    }
  `;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();

    if (data.errors) {
      return {
        success: false,
        error: data.errors.map((e: { message: string }) => e.message).join(", "),
      };
    }

    return {
      success: true,
      shopName: data.data?.shop?.name,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetches products from a Shopify store using the public products.json endpoint
 * This doesn't require an access token but may not work for all stores
 * Filters out sold-out products based on available flag and inventory
 *
 * CONSERVATIVE APPROACH: Only skip products that are DEFINITELY sold out.
 * When inventory data is missing or unclear, include the product.
 *
 * @param storeDomain - The Shopify store domain
 * @param storeName - Display name for the store
 * @param maxProducts - Maximum number of products to fetch (default: 250)
 * @returns Object with products array and skipped count
 */
export async function fetchShopifyProductsPublic(
  storeDomain: string,
  storeName: string,
  maxProducts: number = 250
): Promise<ShopifyFetchResult> {
  const normalizedDomain = normalizeStoreDomain(storeDomain);
  const products: ShopifyProduct[] = [];
  let skippedCount = 0;
  let page = 1;
  // Use 50 per page — some stores cap their public API at 50 regardless of the
  // limit param, so requesting 50 ensures correct page-based pagination.
  const limit = 50;

  while (products.length < maxProducts) {
    const url = `https://${normalizedDomain}/products.json?limit=${limit}&page=${page}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Store requires authentication. Please provide a Storefront Access Token."
        );
      }
      throw new Error(
        `Failed to fetch products: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.products || data.products.length === 0) {
      break;
    }

    for (const product of data.products) {
      if (products.length >= maxProducts) break;

      const variants = product.variants || [];

      // CONSERVATIVE sold-out detection:
      // Only skip if we have EXPLICIT evidence the product is unavailable.
      //
      // Check 1: product.available === false (explicitly unavailable)
      // Check 2: ALL variants have available === false
      //
      // If data is null/undefined, assume product IS available (conservative)

      let isSoldOut = false;

      // If product.available is explicitly false, it's sold out
      if (product.available === false) {
        isSoldOut = true;
        console.log(`[Shopify] Skipping "${product.title}" - product.available is false`);
      }
      // If product.available is null/undefined, check variant availability
      else if (product.available === null || product.available === undefined) {
        // Check if ALL variants are explicitly unavailable
        const hasVariants = variants.length > 0;
        const allVariantsUnavailable = hasVariants && variants.every(
          (v: { available?: boolean }) => v.available === false
        );

        if (allVariantsUnavailable) {
          isSoldOut = true;
          console.log(`[Shopify] Skipping "${product.title}" - all variants unavailable`);
        }
      }

      if (isSoldOut) {
        skippedCount++;
        continue;
      }

      const variant = variants[0];
      const price = variant?.price ? parseFloat(variant.price) : null;
      const variantId = variant?.id ? String(variant.id) : null;
      const shopifyProductId = product.id ? String(product.id) : null;
      const compareAtRawPublic = variant?.compare_at_price ? parseFloat(variant.compare_at_price) : null;
      const compareAtPricePublic = compareAtRawPublic && price && compareAtRawPublic > price ? compareAtRawPublic : null;

      // Extract size from variant options or product options
      let sizeFromVariant: string | null = null;
      const productOptions: Array<{ name: string; values?: string[] }> = product.options || [];
      const sizeOptionIndex = productOptions.findIndex((opt: { name: string }) => /size/i.test(opt.name));
      if (sizeOptionIndex >= 0 && variant) {
        const optionKey = `option${sizeOptionIndex + 1}` as "option1" | "option2" | "option3";
        const val = variant[optionKey];
        // Validate value looks like an actual size (reject "ANIMAL", "Black", etc.)
        if (val && val !== "Default Title" && SIZE_VALUE_REGEX.test(val.trim())) sizeFromVariant = val;
      }
      // Check variant.title as another source (e.g. "M", "US 8") before falling back to text extraction
      // Only accept variant.title as a size if it actually looks like a size (not a color like "Green")
      const rawVariantTitle = variant?.title && variant.title !== "Default Title" ? variant.title : null;
      const variantTitleIfSize = rawVariantTitle && SIZE_VALUE_REGEX.test(rawVariantTitle.trim()) ? rawVariantTitle : null;
      // If sizeFromVariant is only a generic clothing letter (S/M/L/XL…), prefer a more specific
      // size from the title or description (e.g. "35" from "Dior Heels 35" beats "M").
      const isGenericOnly = !!sizeFromVariant && GENERIC_CLOTHING_SIZE.test(sizeFromVariant);
      const sizeFromTitle = extractSizeFromTitle(product.title);
      const sizeFromDescription = extractSizeFromDescription(product.body_html || null);
      const specificSize = sizeFromDescription ?? sizeFromTitle;
      const size = (sizeFromVariant && !isGenericOnly)
        ? sizeFromVariant
        : specificSize ?? variantTitleIfSize ?? (isGenericOnly ? sizeFromVariant : null);
      const allImageUrls: string[] = (product.images || [])
        .map((img: { src?: string }) => img.src)
        .filter(Boolean) as string[];
      const imageUrl = allImageUrls[0] || null;

      // Determine availability for the product record
      // If any variant is available, or if we don't have clear data, assume available
      const anyVariantAvailable = variants.some(
        (v: { available?: boolean }) => v.available === true
      );
      const isAvailable = product.available === true || anyVariantAvailable ||
        (product.available !== false && !variants.every((v: { available?: boolean }) => v.available === false));

      products.push({
        title: product.title,
        price: isNaN(price as number) ? null : price,
        compareAtPrice: compareAtPricePublic,
        currency: "USD", // Public endpoint doesn't include currency, default to USD
        image: imageUrl,
        images: allImageUrls,
        externalUrl: `https://${normalizedDomain}/products/${product.handle}`,
        store: storeName,
        vendor: product.vendor || null,
        productType: product.product_type || null,
        availableForSale: isAvailable,
        description: product.body_html || null,
        variantId,
        shopifyProductId,
        size,
      });
    }

    if (data.products.length < limit) {
      break;
    }

    page++;
  }

  console.log(`[Shopify] ${storeName}: ${products.length} synced, ${skippedCount} skipped (sold out)`);
  return { products, skippedCount };
}

/**
 * Converts ShopifyProduct to the standard RSSProduct format
 * for compatibility with existing product storage
 */
export function toRSSProductFormat(product: ShopifyProduct): {
  title: string;
  price: number | null;
  compareAtPrice: number | null;
  currency: string;
  image: string | null;
  images: string[];
  externalUrl: string;
  store: string;
  description: string | null;
  variantId: string | null;
  shopifyProductId: string | null;
  size: string | null;
} {
  return {
    title: product.title,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    currency: product.currency,
    image: product.image,
    images: product.images,
    externalUrl: product.externalUrl,
    store: product.store,
    description: product.description,
    variantId: product.variantId,
    shopifyProductId: product.shopifyProductId,
    size: product.size,
  };
}
