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
  currency: string;
  image: string | null;
  externalUrl: string;
  store: string;
  vendor: string | null;
  productType: string | null;
  availableForSale: boolean;
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
  priceV2: ShopifyPriceV2;
  availableForSale: boolean;
};

type ShopifyProductNode = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  productType: string;
  availableForSale: boolean;
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
          vendor
          productType
          availableForSale
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 1) {
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
                priceV2 {
                  amount
                  currencyCode
                }
                availableForSale
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
 *
 * @param storeDomain - The Shopify store domain (e.g., "mystore.myshopify.com")
 * @param storefrontAccessToken - The Storefront API access token
 * @param storeName - Display name for the store
 * @param maxProducts - Maximum number of products to fetch (default: 250)
 * @returns Array of parsed products
 */
export async function fetchShopifyProducts(
  storeDomain: string,
  storefrontAccessToken: string,
  storeName: string,
  maxProducts: number = 250
): Promise<ShopifyProduct[]> {
  const normalizedDomain = normalizeStoreDomain(storeDomain);
  const endpoint = `https://${normalizedDomain}/api/2024-01/graphql.json`;

  const products: ShopifyProduct[] = [];
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
      const price = parseFloat(node.priceRange.minVariantPrice.amount);
      const currency = node.priceRange.minVariantPrice.currencyCode;
      const imageUrl = node.images.edges[0]?.node.url || null;

      products.push({
        title: node.title,
        price: isNaN(price) ? null : price,
        currency,
        image: imageUrl,
        externalUrl: getProductUrl(normalizedDomain, node.handle),
        store: storeName,
        vendor: node.vendor || null,
        productType: node.productType || null,
        availableForSale: node.availableForSale,
      });
    }

    hasNextPage = data.data.products.pageInfo.hasNextPage;
    cursor = data.data.products.pageInfo.endCursor;
  }

  return products;
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
 * Converts ShopifyProduct to the standard RSSProduct format
 * for compatibility with existing product storage
 */
export function toRSSProductFormat(product: ShopifyProduct): {
  title: string;
  price: number | null;
  image: string | null;
  externalUrl: string;
  store: string;
} {
  return {
    title: product.title,
    price: product.price,
    image: product.image,
    externalUrl: product.externalUrl,
    store: product.store,
  };
}
