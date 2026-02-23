import { NextRequest, NextResponse } from "next/server";
import {
  getProductsMissingCollabsLink,
  updateCollabsLinkByShopifyProductId,
} from "@/app/lib/db";
import { stores } from "@/app/lib/stores";

// Allow up to 5 minutes for bulk generation
export const maxDuration = 300;

// Map VIA store slugs to Collabs shopifyStoreIds
const COLLABS_STORES = stores
  .filter((s) => "collabsStoreId" in s)
  .map((s) => ({
    slug: s.slug,
    name: s.name,
    collabsStoreId: (s as any).collabsStoreId as string,
  }));

const COLLABS_STORE_SLUGS = new Set(COLLABS_STORES.map((s) => s.slug));

const COLLABS_GRAPHQL_URL =
  "https://api.collabs.shopify.com/creator/graphql";

// Query to list products for a store — returns Collabs IDs, Shopify IDs, and existing affiliate links
const PRODUCTS_QUERY = `
  query ProductsQuery($searchParams: ProductsSearchInput!, $first: Int, $after: String, $seed: String!) {
    products(searchParams: $searchParams, first: $first, after: $after, seed: $seed) {
      nodes {
        id
        title
        shopifyProductId
        affiliateProduct {
          url
        }
      }
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// Mutation to create an affiliate link for a product (uses Collabs internal product ID)
const CREATE_MUTATION = `
  mutation ProductListAffiliateProductCreateMutation($input: AffiliateProductCreateInput!) {
    affiliateProductCreate(input: $input) {
      affiliateProduct {
        url
      }
      userErrors {
        field
        message
      }
    }
  }
`;

type CollabsProduct = {
  id: string;
  title: string;
  shopifyProductId: string;
  affiliateProduct: { url: string } | null;
};

async function fetchCollabsProducts(
  collabsStoreId: string,
  cookie: string,
  csrfToken: string
): Promise<CollabsProduct[]> {
  const all: CollabsProduct[] = [];
  let after: string | null = null;
  const gid = `gid://dovetale-api/ShopifyStore/${collabsStoreId}`;

  while (true) {
    const res = await fetch(COLLABS_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "X-Csrf-Token": csrfToken,
      },
      body: JSON.stringify({
        operationName: "ProductsQuery",
        query: PRODUCTS_QUERY,
        variables: {
          first: 100,
          after,
          seed: Math.random().toString(36).slice(2),
          searchParams: {
            brandValues: [],
            categories: [],
            shopifyStoreId: gid,
          },
        },
      }),
    });

    if (!res.ok) break;

    const json = await res.json();
    const products = json?.data?.products;
    if (!products?.nodes) break;

    all.push(...products.nodes);

    if (products.pageInfo?.hasNextPage && products.pageInfo.endCursor) {
      after = products.pageInfo.endCursor;
      // Small delay between pages
      await new Promise((r) => setTimeout(r, 200));
    } else {
      break;
    }
  }

  return all;
}

async function createAffiliateLink(
  collabsProductId: string,
  cookie: string,
  csrfToken: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const res = await fetch(COLLABS_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "X-Csrf-Token": csrfToken,
      },
      body: JSON.stringify({
        operationName: "ProductListAffiliateProductCreateMutation",
        query: CREATE_MUTATION,
        variables: {
          input: {
            productId: collabsProductId,
            origin: "LINK_GENERATION",
          },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { url: null, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = await res.json();
    const userErrors = data?.data?.affiliateProductCreate?.userErrors;
    if (userErrors && userErrors.length > 0) {
      return {
        url: null,
        error: userErrors
          .map((e: { message: string }) => e.message)
          .join(", "),
      };
    }

    const url =
      data?.data?.affiliateProductCreate?.affiliateProduct?.url ?? null;
    return { url, error: url ? null : "No URL in response" };
  } catch (e) {
    return {
      url: null,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

// Simple hash function — must match middleware
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;

  const adminToken = request.cookies.get("via_admin_token")?.value;
  if (adminToken && adminToken === hashPassword(adminPassword)) return true;

  return false;
}

/**
 * POST /api/admin/generate-collabs-links
 *
 * Fetches all products from Collabs for each store, grabs existing affiliate
 * URLs, creates new ones where missing, and saves them to VIA's database.
 * Streams progress as newline-delimited JSON.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { cookie, csrfToken, storeSlug } = body as {
    cookie?: string;
    csrfToken?: string;
    storeSlug?: string;
  };

  if (!cookie || !csrfToken) {
    return NextResponse.json(
      { error: "cookie and csrfToken are required" },
      { status: 400 }
    );
  }

  const targetStores = storeSlug
    ? COLLABS_STORES.filter((s) => s.slug === storeSlug)
    : COLLABS_STORES;

  if (targetStores.length === 0) {
    return NextResponse.json(
      { error: `Store '${storeSlug}' not found` },
      { status: 400 }
    );
  }

  // Get products missing collabs links from VIA's database
  const missingProducts = await getProductsMissingCollabsLink(storeSlug);
  const missingByShopifyId = new Set(
    missingProducts
      .filter((p) => p.shopify_product_id && COLLABS_STORE_SLUGS.has(p.store_slug))
      .map((p) => p.shopify_product_id!)
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let saved = 0;
      let created = 0;
      let failed = 0;
      let skipped = 0;

      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      }

      send({ type: "start", stores: targetStores.length, missingInDb: missingByShopifyId.size });

      for (const store of targetStores) {
        send({ type: "store", store: store.name, slug: store.slug });

        // Fetch all products from Collabs for this store
        const collabsProducts = await fetchCollabsProducts(
          store.collabsStoreId,
          cookie,
          csrfToken
        );

        send({
          type: "store_products",
          store: store.name,
          count: collabsProducts.length,
        });

        for (const product of collabsProducts) {
          // Extract the numeric Shopify product ID from the GID
          const shopifyId = product.shopifyProductId?.match(/(\d+)$/)?.[1];
          if (!shopifyId || !missingByShopifyId.has(shopifyId)) {
            skipped++;
            continue;
          }

          let collabsUrl = product.affiliateProduct?.url || null;

          // If no existing affiliate link, create one using the Collabs product ID
          if (!collabsUrl) {
            const result = await createAffiliateLink(
              product.id,
              cookie,
              csrfToken
            );
            if (result.url) {
              collabsUrl = result.url;
              created++;
            } else {
              failed++;
              send({
                type: "error",
                product: product.title,
                store: store.name,
                error: result.error,
              });
              await new Promise((r) => setTimeout(r, 300));
              continue;
            }
          }

          // Save to VIA's database
          if (collabsUrl) {
            await updateCollabsLinkByShopifyProductId(shopifyId, collabsUrl);
            saved++;
            missingByShopifyId.delete(shopifyId);

            send({
              type: "progress",
              saved,
              created,
              failed,
              skipped,
              product: product.title,
              store: store.name,
              url: collabsUrl,
            });
          }

          // Rate-limit
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      send({
        type: "done",
        success: failed === 0,
        saved,
        created,
        failed,
        skipped,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}

/**
 * GET /api/admin/generate-collabs-links
 * Returns stats on how many products need collabs links generated.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await getProductsMissingCollabsLink();
  const candidates = products.filter((p) =>
    COLLABS_STORE_SLUGS.has(p.store_slug)
  );

  const byStore = candidates.reduce(
    (acc, p) => {
      acc[p.store_slug] = (acc[p.store_slug] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return NextResponse.json({
    total: candidates.length,
    byStore,
    collabsStores: Array.from(COLLABS_STORE_SLUGS),
  });
}
