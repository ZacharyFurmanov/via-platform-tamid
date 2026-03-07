import { NextRequest, NextResponse } from "next/server";
import { saveConversion } from "@/app/lib/analytics-db";
import { stores } from "@/app/lib/stores";
import { neon } from "@neondatabase/serverless";

/**
 * Verify Shopify's HMAC-SHA256 webhook signature.
 * Shopify signs the raw body with the webhook secret and base64-encodes the result.
 */
async function verifyShopifyHmac(
  body: string,
  hmacHeader: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const digest = Buffer.from(new Uint8Array(signed)).toString("base64");
  return digest === hmacHeader;
}

/**
 * Find the store config from the ?store= query param or the X-Shopify-Shop-Domain header.
 */
function resolveStore(
  storeSlugParam: string | null,
  shopDomain: string | null
): { slug: string; name: string } | null {
  // Prefer explicit store slug param (most reliable — encoded in the webhook URL)
  if (storeSlugParam) {
    const store = stores.find((s) => s.slug === storeSlugParam);
    if (store) return { slug: store.slug, name: store.name };
  }

  // Fall back to matching by Shopify shop domain against store website URLs
  if (shopDomain) {
    const store = stores.find((s) => {
      try {
        const hostname = new URL(s.website).hostname.replace(/^www\./, "");
        return shopDomain === hostname || shopDomain.startsWith(hostname) || hostname.startsWith(shopDomain.replace(".myshopify.com", ""));
      } catch {
        return false;
      }
    });
    if (store) return { slug: store.slug, name: store.name };
  }

  return null;
}

export async function POST(request: NextRequest) {
  // Read raw body first (must happen before any other reads)
  const body = await request.text();

  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!hmac || !secret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  // Verify signature before doing anything else
  const valid = await verifyShopifyHmac(body, hmac, secret);
  if (!valid) {
    console.error(`[shopify-webhook] Invalid HMAC from shop: ${shopDomain}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Only process order events; acknowledge everything else silently
  if (topic !== "orders/create" && topic !== "orders/paid") {
    return NextResponse.json({ received: true });
  }

  let order: Record<string, unknown>;
  try {
    order = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // For orders/create, only save confirmed payments (skip pending bank transfers etc.)
  if (topic === "orders/create" && order.financial_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const { searchParams } = new URL(request.url);
  const storeSlugParam = searchParams.get("store");
  const resolved = resolveStore(storeSlugParam, shopDomain);

  if (!resolved) {
    console.error(`[shopify-webhook] Unknown store: domain=${shopDomain}, store param=${storeSlugParam}`);
    // Return 200 so Shopify doesn't keep retrying for misconfigured stores
    return NextResponse.json({ received: true });
  }

  const { slug: storeSlug, name: storeName } = resolved;

  const orderId = String(order.id);
  const orderTotal = parseFloat(String(order.total_price || "0"));
  const currency = (order.currency as string) || "USD";

  const lineItems = (order.line_items as Array<Record<string, unknown>>) || [];
  const items = lineItems.map((item) => ({
    productName: (item.title as string) || "Unknown",
    quantity: (item.quantity as number) || 1,
    price: parseFloat(String(item.price || "0")),
    productId: item.product_id ? String(item.product_id) : undefined,
  }));

  // Try to find a matching VIA click — most recent click for this store in the
  // last 24 hours. Not a perfect match but covers the typical purchase window.
  let matchedClick: { click_id: string; timestamp: unknown; product_name: string } | null = null;
  try {
    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const rows = await sql`
      SELECT click_id, timestamp, product_name
      FROM clicks
      WHERE store_slug = ${storeSlug}
        AND timestamp >= ${cutoff}
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    if (rows.length > 0) matchedClick = rows[0] as { click_id: string; timestamp: unknown; product_name: string };
  } catch (err) {
    console.error(`[shopify-webhook] Failed to query clicks for match:`, err);
  }

  const conversionId = `shopify-${storeSlug}-${orderId}`;

  try {
    const { duplicate } = await saveConversion({
      conversionId,
      timestamp: new Date().toISOString(),
      orderId,
      orderTotal,
      currency,
      items,
      viaClickId: matchedClick ? String(matchedClick.click_id) : null,
      storeSlug,
      storeName,
      matched: !!matchedClick,
      matchedClickData: matchedClick
        ? {
            clickId: String(matchedClick.click_id),
            clickTimestamp:
              (matchedClick.timestamp as Date)?.toISOString?.() ||
              String(matchedClick.timestamp),
            productName: String(matchedClick.product_name),
          }
        : undefined,
    });

    if (duplicate) {
      console.log(`[shopify-webhook] Duplicate order ignored: ${orderId} (${storeName})`);
    } else {
      console.log(
        `[shopify-webhook] Conversion saved: store=${storeSlug}, order=${orderId}, total=${currency} ${orderTotal}, matched=${!!matchedClick}`
      );
    }
  } catch (err) {
    console.error(`[shopify-webhook] Failed to save conversion for order ${orderId}:`, err);
    // Still return 200 — if we 500, Shopify retries indefinitely
  }

  return NextResponse.json({ received: true });
}
