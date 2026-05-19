import { NextRequest, NextResponse } from "next/server";
import { saveConversion } from "@/app/lib/analytics-db";
import { syncProducts } from "@/app/lib/db";
import { neon } from "@neondatabase/serverless";

const STORE_SLUG = "carroll-street-vintage";
const STORE_NAME = "Carroll Street Vintage";

interface StripeCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  billing_details: { email: string | null; name: string | null };
  receipt_email: string | null;
  description: string | null;
}

async function fetchStripeCharges(apiKey: string, createdAfter: number): Promise<StripeCharge[]> {
  const all: StripeCharge[] = [];
  let startingAfter: string | null = null;

  while (true) {
    const params = new URLSearchParams({
      limit: "100",
      "created[gte]": String(createdAfter),
    });
    if (startingAfter) params.set("starting_after", startingAfter);

    const resp = await fetch(`https://api.stripe.com/v1/charges?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Stripe API error ${resp.status}: ${err}`);
    }

    const data = (await resp.json()) as { data: StripeCharge[]; has_more: boolean };
    all.push(...data.data);
    if (!data.has_more || data.data.length === 0) break;
    startingAfter = data.data[data.data.length - 1].id;
  }

  return all;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.STRIPE_SECRET_KEY_CARROLL;
  if (!apiKey) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY_CARROLL not set" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const since = (body as { since?: string }).since;
  const cutoffDate = since
    ? new Date(since)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const createdAfter = Math.floor(cutoffDate.getTime() / 1000);

  const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");

  let charges: StripeCharge[];
  try {
    charges = await fetchStripeCharges(apiKey, createdAfter);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const succeeded = charges.filter((c) => c.status === "succeeded");

  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (const charge of succeeded) {
    const email = charge.billing_details?.email || charge.receipt_email;
    const conversionId = `stripe-${STORE_SLUG}-${charge.id}`;
    const orderTotal = charge.amount / 100;
    const currency = charge.currency.toUpperCase();
    const timestamp = new Date(charge.created * 1000).toISOString();

    type ClickRow = { click_id: string; product_name: string; timestamp: string; user_id: string | null };

    // Match buyer to a VYA user by email
    let userId: string | null = null;
    if (email) {
      const userRows = await sql`
        SELECT id FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1
      `.catch(() => []);
      if (userRows.length > 0) userId = String((userRows[0] as { id: unknown }).id);
    }

    // Find the most recent VYA click for this store (within 7 days before the charge)
    const clickCutoff = new Date(charge.created * 1000 - 7 * 24 * 60 * 60 * 1000).toISOString();
    let matchedClick: ClickRow | null = null;

    if (userId) {
      const clickRows = await sql`
        SELECT click_id, product_name, timestamp, user_id
        FROM clicks
        WHERE store_slug = ${STORE_SLUG}
          AND user_id = ${userId}
          AND timestamp >= ${clickCutoff}
          AND timestamp <= ${timestamp}
        ORDER BY timestamp DESC
        LIMIT 1
      `.catch(() => []);
      if (clickRows.length > 0) matchedClick = clickRows[0] as ClickRow;
    }

    // Fallback: any recent click for this store (last 7 days) if no user match
    if (!matchedClick && !userId) {
      const clickRows = await sql`
        SELECT click_id, product_name, timestamp, user_id
        FROM clicks
        WHERE store_slug = ${STORE_SLUG}
          AND timestamp >= ${clickCutoff}
          AND timestamp <= ${timestamp}
        ORDER BY timestamp DESC
        LIMIT 1
      `.catch(() => []);
      if (clickRows.length > 0) matchedClick = clickRows[0] as ClickRow;
    }

    const isMatched = !!matchedClick || !!userId;

    try {
      const { duplicate } = await saveConversion({
        conversionId,
        timestamp,
        orderId: charge.id,
        orderTotal,
        currency,
        items: charge.description ? [{ productName: charge.description, quantity: 1, price: orderTotal }] : [],
        viaClickId: matchedClick ? matchedClick.click_id : null,
        userId: userId ?? undefined,
        storeSlug: STORE_SLUG,
        storeName: STORE_NAME,
        matched: isMatched,
        matchedClickData: matchedClick
          ? { clickId: matchedClick.click_id, clickTimestamp: matchedClick.timestamp, productName: matchedClick.product_name, source: "stripe-click-match" }
          : userId
          ? { source: "stripe-email-match", userId, buyerEmail: email ?? undefined }
          : { source: "stripe-unmatched" },
      });

      if (duplicate) {
        skipped++;
      } else {
        saved++;
        console.log(`[carroll-street-stripe] Saved: ${charge.id} $${orderTotal} matched=${isMatched}`);
      }
    } catch (err) {
      console.error(`[carroll-street-stripe] Error saving ${charge.id}:`, err);
      errors++;
    }
  }

  return NextResponse.json({
    ok: true,
    totalCharges: succeeded.length,
    saved,
    skipped,
    errors,
    since: cutoffDate.toISOString(),
  });
}

// ── Product sync ─────────────────────────────────────────────────────────────

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  url: string | null;
  active: boolean;
  default_price: {
    id: string;
    unit_amount: number | null;
    currency: string;
  } | null;
}

interface StripePaymentLink {
  id: string;
  url: string;
  active: boolean;
}

interface StripeLineItem {
  price: { id: string; product: string } | null;
}

async function stripeGet<T>(apiKey: string, path: string): Promise<T> {
  const resp = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resp.ok) throw new Error(`Stripe ${path} → ${resp.status}: ${await resp.text()}`);
  return resp.json() as Promise<T>;
}

async function fetchAllStripeProducts(apiKey: string): Promise<StripeProduct[]> {
  const all: StripeProduct[] = [];
  let startingAfter: string | null = null;
  while (true) {
    const qs = new URLSearchParams({ limit: "100", active: "true", "expand[]": "data.default_price" });
    if (startingAfter) qs.set("starting_after", startingAfter);
    const page = await stripeGet<{ data: StripeProduct[]; has_more: boolean }>(apiKey, `/products?${qs}`);
    all.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;
  }
  return all;
}

async function buildPaymentLinkMap(apiKey: string): Promise<Map<string, string>> {
  // Returns productId → payment link buy URL
  const productToUrl = new Map<string, string>();
  let startingAfter: string | null = null;
  while (true) {
    const qs = new URLSearchParams({ limit: "100", active: "true" });
    if (startingAfter) qs.set("starting_after", startingAfter);
    const page = await stripeGet<{ data: StripePaymentLink[]; has_more: boolean }>(apiKey, `/payment_links?${qs}`);
    for (const link of page.data) {
      // Fetch line items for this payment link to find which product it sells
      try {
        const items = await stripeGet<{ data: StripeLineItem[] }>(apiKey, `/payment_links/${link.id}/line_items?limit=10`);
        for (const item of items.data) {
          if (item.price?.product) {
            productToUrl.set(item.price.product, link.url);
          }
        }
      } catch { /* skip this link if line items fail */ }
    }
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;
  }
  return productToUrl;
}

export async function GET(request: NextRequest) {
  void request;
  const apiKey = process.env.STRIPE_SECRET_KEY_CARROLL;
  if (!apiKey) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY_CARROLL not set" }, { status: 500 });
  }

  let products: StripeProduct[];
  let paymentLinkMap: Map<string, string>;

  try {
    [products, paymentLinkMap] = await Promise.all([
      fetchAllStripeProducts(apiKey),
      buildPaymentLinkMap(apiKey),
    ]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const mapped = products.map((p) => ({
    title: p.name,
    price: p.default_price?.unit_amount ? p.default_price.unit_amount / 100 : 0,
    currency: (p.default_price?.currency ?? "usd").toUpperCase(),
    image: p.images[0] ?? null,
    images: p.images.length > 0 ? p.images : undefined,
    externalUrl: paymentLinkMap.get(p.id) ?? p.url ?? "https://carrollstreetvintage.com",
    description: p.description ?? undefined,
    variantId: p.default_price?.id ?? undefined,
  })).filter((p) => p.price > 0);

  const { count } = await syncProducts(STORE_SLUG, STORE_NAME, mapped);

  return NextResponse.json({ ok: true, productCount: count, total: products.length });
}
