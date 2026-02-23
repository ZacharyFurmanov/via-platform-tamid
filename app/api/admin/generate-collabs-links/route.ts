import { NextRequest, NextResponse } from "next/server";
import {
  getProductsMissingCollabsLink,
  updateCollabsLink,
} from "@/app/lib/db";
import { stores } from "@/app/lib/stores";

// Slugs of Collabs-enabled stores (those with affiliatePath)
const COLLABS_STORE_SLUGS = new Set(
  stores
    .filter((s) => "affiliatePath" in s)
    .map((s) => s.slug)
);

const COLLABS_GRAPHQL_URL =
  "https://api.collabs.shopify.com/creator/graphql";

const MUTATION = `
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

async function generateCollabsLink(
  shopifyProductId: string,
  cookie: string,
  csrfToken: string
): Promise<string | null> {
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
        query: MUTATION,
        variables: {
          input: {
            productId: shopifyProductId,
            origin: "LINK_GENERATION",
          },
        },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const url =
      data?.data?.affiliateProductCreate?.affiliateProduct?.url ?? null;
    return url;
  } catch {
    return null;
  }
}

/**
 * POST /api/admin/generate-collabs-links
 *
 * Bulk-generates per-product collabs.shop affiliate links for all Collabs-enabled
 * stores that have a shopify_product_id but no collabs_link yet.
 *
 * Body:
 *   cookie      — full Cookie header value from an active Shopify Collabs browser session
 *   csrfToken   — X-Csrf-Token header value from the same session
 *   storeSlug   — (optional) limit to a single store
 *   dryRun      — (optional) if true, just count products without generating
 *
 * Auth: requires ADMIN_PASSWORD env var in Authorization header (Bearer <password>)
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { cookie, csrfToken, storeSlug, dryRun } = body as {
    cookie?: string;
    csrfToken?: string;
    storeSlug?: string;
    dryRun?: boolean;
  };

  if (!dryRun && (!cookie || !csrfToken)) {
    return NextResponse.json(
      { error: "cookie and csrfToken are required unless dryRun is true" },
      { status: 400 }
    );
  }

  // Validate storeSlug is Collabs-enabled if provided
  if (storeSlug && !COLLABS_STORE_SLUGS.has(storeSlug)) {
    return NextResponse.json(
      {
        error: `Store '${storeSlug}' is not a Collabs-enabled store`,
        collabsStores: Array.from(COLLABS_STORE_SLUGS),
      },
      { status: 400 }
    );
  }

  const products = await getProductsMissingCollabsLink(storeSlug);

  // Filter to Collabs-enabled stores only
  const candidates = storeSlug
    ? products
    : products.filter((p) => COLLABS_STORE_SLUGS.has(p.store_slug));

  if (dryRun) {
    const byStore = candidates.reduce((acc, p) => {
      acc[p.store_slug] = (acc[p.store_slug] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return NextResponse.json({ dryRun: true, total: candidates.length, byStore });
  }

  let generated = 0;
  let failed = 0;
  const errors: { id: number; title: string; error: string }[] = [];

  for (const product of candidates) {
    const link = await generateCollabsLink(
      product.shopify_product_id!,
      cookie!,
      csrfToken!
    );

    if (link) {
      await updateCollabsLink(product.id, link);
      generated++;
    } else {
      failed++;
      errors.push({
        id: product.id,
        title: product.title,
        error: "No URL returned from Collabs API",
      });
    }

    // Rate-limit: 1 request per 300ms to be respectful to the API
    await new Promise((r) => setTimeout(r, 300));
  }

  return NextResponse.json({
    success: failed === 0,
    total: candidates.length,
    generated,
    failed,
    ...(errors.length > 0 && { errors }),
  });
}

/**
 * GET /api/admin/generate-collabs-links
 * Returns stats on how many products need collabs links generated.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await getProductsMissingCollabsLink();
  const candidates = products.filter((p) => COLLABS_STORE_SLUGS.has(p.store_slug));

  const byStore = candidates.reduce((acc, p) => {
    acc[p.store_slug] = (acc[p.store_slug] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({
    total: candidates.length,
    byStore,
    collabsStores: Array.from(COLLABS_STORE_SLUGS),
  });
}
