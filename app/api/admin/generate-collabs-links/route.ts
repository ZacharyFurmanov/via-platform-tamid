import { NextRequest, NextResponse } from "next/server";
import {
  getProductsMissingCollabsLink,
  updateCollabsLink,
} from "@/app/lib/db";
import { stores } from "@/app/lib/stores";

// Allow up to 5 minutes for bulk generation
export const maxDuration = 300;

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

  // Accept Bearer token (for scripts)
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;

  // Accept admin cookie (for browser UI)
  const adminToken = request.cookies.get("via_admin_token")?.value;
  if (adminToken && adminToken === hashPassword(adminPassword)) return true;

  return false;
}

/**
 * POST /api/admin/generate-collabs-links
 *
 * Streams progress as newline-delimited JSON while generating per-product
 * collabs.shop affiliate links. Each line is a JSON object with the current
 * progress so the UI can update in real-time.
 *
 * Auth: admin cookie or Bearer token
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
  const candidates = storeSlug
    ? products
    : products.filter((p) => COLLABS_STORE_SLUGS.has(p.store_slug));

  // Stream progress as newline-delimited JSON
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let generated = 0;
      let failed = 0;
      const errors: { id: number; title: string; error: string }[] = [];

      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      }

      send({ type: "start", total: candidates.length });

      for (const product of candidates) {
        const link = await generateCollabsLink(
          product.shopify_product_id!,
          cookie,
          csrfToken
        );

        if (link) {
          await updateCollabsLink(product.id, link);
          generated++;
          send({
            type: "progress",
            generated,
            failed,
            current: generated + failed,
            total: candidates.length,
            product: product.title,
            store: product.store_slug,
          });
        } else {
          failed++;
          errors.push({
            id: product.id,
            title: product.title,
            error: "No URL returned from Collabs API",
          });
          send({
            type: "progress",
            generated,
            failed,
            current: generated + failed,
            total: candidates.length,
            product: product.title,
            store: product.store_slug,
            error: true,
          });
        }

        // Rate-limit: 1 request per 300ms
        await new Promise((r) => setTimeout(r, 300));
      }

      send({
        type: "done",
        success: failed === 0,
        total: candidates.length,
        generated,
        failed,
        ...(errors.length > 0 && { errors }),
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
