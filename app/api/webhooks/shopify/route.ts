import { NextRequest, NextResponse } from "next/server";
import { saveConversion } from "@/app/lib/analytics-db";
import { stores, convertCurrencyToUSD, refreshExchangeRates } from "@/app/lib/stores";
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
  const orderCurrency = (order.currency as string) || "USD";

  const lineItems = (order.line_items as Array<Record<string, unknown>>) || [];
  const items = lineItems.map((item) => ({
    productName: (item.title as string) || "Unknown",
    quantity: (item.quantity as number) || 1,
    price: parseFloat(String(item.price || "0")),
    productId: item.product_id ? String(item.product_id) : undefined,
  }));

  // Prefer total_price from Shopify; fall back to summing line items if missing/zero
  const rawTotal = parseFloat(String(order.total_price || order.subtotal_price || "0"));
  const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const localTotal = rawTotal > 0 ? rawTotal : itemsTotal;

  // Convert to USD so analytics/commission math is always in one currency.
  // Fetch live rates; falls back to hardcoded approximations if the request fails.
  if (orderCurrency !== "USD") await refreshExchangeRates();
  const orderTotal = convertCurrencyToUSD(localTotal, orderCurrency);
  const currency = "USD";

  // Extract buyer email from order (Shopify includes it at order.email or order.customer.email)
  const buyerEmail: string | null =
    (order.email as string | null) ||
    ((order.customer as Record<string, unknown> | null)?.email as string | null) ||
    null;

  const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");

  // Try to find a matching VYA click — most recent click for this store in the
  // last 7 days. Wider window catches users who browse then buy days later.
  let matchedClick: { click_id: string; timestamp: unknown; product_name: string; user_id: string | null } | null = null;
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const rows = await sql`
      SELECT click_id, timestamp, product_name, user_id
      FROM clicks
      WHERE store_slug = ${storeSlug}
        AND timestamp >= ${cutoff}
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    if (rows.length > 0) matchedClick = rows[0] as { click_id: string; timestamp: unknown; product_name: string; user_id: string | null };
  } catch (err) {
    console.error(`[shopify-webhook] Failed to query clicks for match:`, err);
  }

  // Try to match by buyer email — look up the VYA user account for this order
  let matchedUserId: string | null = matchedClick?.user_id ?? null;
  if (!matchedUserId && buyerEmail) {
    try {
      const userRows = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${buyerEmail}) LIMIT 1`;
      if (userRows.length > 0) matchedUserId = String(userRows[0].id);
    } catch (err) {
      console.error(`[shopify-webhook] Failed to look up user by email:`, err);
    }
  }
  // Also try to enrich click's user_id if the click had no user but we found one by email
  if (matchedClick && !matchedClick.user_id && matchedUserId) {
    matchedClick = { ...matchedClick, user_id: matchedUserId };
  }

  const isMatched = !!matchedClick || !!matchedUserId;

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
      userId: matchedUserId ?? undefined,
      storeSlug,
      storeName,
      matched: isMatched,
      matchedClickData: matchedClick
        ? {
            clickId: String(matchedClick.click_id),
            clickTimestamp:
              (matchedClick.timestamp as Date)?.toISOString?.() ||
              String(matchedClick.timestamp),
            productName: String(matchedClick.product_name),
          }
        : matchedUserId
        ? { source: "email-match", userId: matchedUserId, buyerEmail: buyerEmail ?? undefined }
        : undefined,
    });

    if (duplicate) {
      console.log(`[shopify-webhook] Duplicate order ignored: ${orderId} (${storeName})`);
    } else {
      console.log(
        `[shopify-webhook] Conversion saved: store=${storeSlug}, order=${orderId}, total=${currency} ${orderTotal}, matched=${isMatched}, userId=${matchedUserId ?? "none"}`
      );
    }
  } catch (err) {
    console.error(`[shopify-webhook] Failed to save conversion for order ${orderId}:`, err);
    // Still return 200 — if we 500, Shopify retries indefinitely
  }

  return NextResponse.json({ received: true });
}
