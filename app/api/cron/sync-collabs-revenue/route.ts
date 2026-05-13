import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { saveSetting, getSetting } from "@/app/lib/settings-db";
import { stores, convertCurrencyToUSD } from "@/app/lib/stores";

export const maxDuration = 60;

// Build a lowercase name → slug map from our store config
const storeNameToSlug = new Map<string, string>(
  stores.map((s) => [s.name.toLowerCase(), s.slug])
);

// Also build a normalized (no dashes/spaces) slug → slug map
// so camelCase Collabs handles like "PortersPreloved" resolve correctly
const slugByNormalized = new Map<string, string>(
  stores.map((s) => [s.slug.replace(/-/g, ""), s.slug])
);

// Explicit overrides for Collabs brand names that differ significantly from VYA names
const collabsHandleOverrides: Record<string, string> = {
  "source 24": "source-twenty-four",
  "chill boutique consignment": "chill-boutique",
  "chillboutiqueconsignment": "chill-boutique",
};

function resolveStoreSlug(brandName: string): string {
  // Strip leading/trailing punctuation and whitespace the Collabs API sometimes appends
  const key = brandName.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "").trim();

  // 1. Exact name match
  if (storeNameToSlug.has(key)) return storeNameToSlug.get(key)!;

  // 2. Explicit overrides for known mismatches
  if (collabsHandleOverrides[key]) return collabsHandleOverrides[key];

  // 3. Normalized match — handles camelCase handles like "PortersPreloved" → "porters-preloved"
  const normalized = key.replace(/[^a-z0-9]/g, "");
  if (slugByNormalized.has(normalized)) return slugByNormalized.get(normalized)!;

  // 4. Fallback
  return key.replace(/\s+/g, "-");
}

function parseCommission(displayValue: string): number {
  const n = parseFloat(displayValue.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

type CommissionRule = { value: number }; // value is a percentage, e.g. 7 means 7%

/**
 * Calculate order total from a commission amount using the store's actual commission rates.
 * For flat-rate stores (one rule), the result is exact.
 * For tiered stores, picks the tier whose implied price is self-consistent with that tier.
 */
function calculateOrderTotal(commissionUsd: number, rules: CommissionRule[]): number {
  if (commissionUsd <= 0) return 0;
  if (rules.length === 0) return estimateRevenue(commissionUsd);

  // Unique rates sorted high → low (highest rate applies to lowest price tier)
  const rates = [...new Set(rules.map((r) => r.value / 100))].sort((a, b) => b - a);
  if (rates.length === 1) return commissionUsd / rates[0]; // Flat rate — exact

  // Tiered: try each rate; pick the first one where the implied price is plausibly
  // within that tier. We use $1k and $5k as standard breakpoints.
  const tierCeilings = [1000, 5000]; // upper bound for each tier index
  for (let i = 0; i < rates.length; i++) {
    const implied = commissionUsd / rates[i];
    const ceiling = tierCeilings[i] ?? Infinity;
    if (implied < ceiling) return implied;
  }
  return commissionUsd / rates[rates.length - 1];
}

/** Fallback: reverse-calculate from assumed VYA tiers (7/5/3%) when no rules are available. */
function estimateRevenue(commission: number): number {
  if (commission <= 0) return 0;
  let implied = commission / 0.07;
  if (implied < 1000) return implied;
  implied = commission / 0.05;
  if (implied <= 5000) return implied;
  return commission / 0.03;
}

/**
 * Try to fetch individual Commission records for a partnership.
 * Tries each PayoutGroup value until we find records.
 * Returns null if the API doesn't support this or no records are found.
 *
 * Attempts a rich query first (with lineItemTitle + order name); if the API
 * doesn't expose those fields, falls back to the minimal query.
 */
async function fetchIndividualCommissions(
  partnershipId: string,
  cookie: string,
  csrfToken: string,
  lastSyncedAt: string | null,
  deltaOrders: number
): Promise<{ commissionUsdAmount: number; earnedAt: string; productName?: string; shopifyOrderName?: string }[] | null> {
  const groups = ["NEXT_PAYOUT", "IN_HOLDING_PERIOD", "PAYOUT_REQUESTED", "CREATOR_ACTION_REQUIRED", "PAID_OUT"];
  const headers = {
    "content-type": "application/json",
    "cookie": cookie,
    "x-csrf-token": csrfToken,
    "origin": "https://collabs.shopify.com",
    "referer": "https://collabs.shopify.com/",
    "x-client-type": "web",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
  };

  // Whether the richer query fields are supported by the API (detected on first attempt)
  let richFieldsSupported: boolean | null = null;

  const makeBody = (group: string, rich: boolean) => JSON.stringify({
    query: `query {
      payouts {
        partnershipCommissions(group: ${group}, partnershipId: "${partnershipId}", first: ${deltaOrders + 5}) {
          nodes {
            id commissionUsd { amount } earnedAt
            ${rich ? "lineItemTitle order { name }" : ""}
          }
        }
      }
    }`,
  });

  for (const group of groups) {
    try {
      // First pass: try rich query (or minimal if we already know rich isn't supported)
      const useRich = richFieldsSupported !== false;
      let res = await fetch(COLLABS_GRAPHQL_URL, { method: "POST", headers, body: makeBody(group, useRich) });
      let json = await res.json();

      // If rich query errored, remember that and retry with minimal query
      if (json.errors && useRich) {
        richFieldsSupported = false;
        res = await fetch(COLLABS_GRAPHQL_URL, { method: "POST", headers, body: makeBody(group, false) });
        json = await res.json();
      }

      if (json.errors) continue;
      if (richFieldsSupported === null) richFieldsSupported = true;

      const nodes = (json?.data?.payouts?.partnershipCommissions?.nodes ?? []) as {
        id: string;
        commissionUsd: { amount: number };
        earnedAt: string;
        lineItemTitle?: string;
        order?: { name: string };
      }[];
      if (nodes.length === 0) continue;

      const cutoff = lastSyncedAt ? new Date(lastSyncedAt) : null;
      const recent = cutoff
        ? nodes.filter((n) => new Date(n.earnedAt) > cutoff)
        : nodes.slice(0, deltaOrders);

      if (recent.length > 0) {
        return recent.map((n) => ({
          commissionUsdAmount: n.commissionUsd.amount,
          earnedAt: n.earnedAt,
          productName: n.lineItemTitle ?? undefined,
          shopifyOrderName: n.order?.name ?? undefined,
        }));
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function saveCollabsConversions(
  partnershipId: string,
  brandName: string,
  deltaOrders: number,
  deltaCommission: number,
  currency: string,
  now: string,
  lastSyncedAt: string | null,
  prevOrderCount: number,
  commissionRules: CommissionRule[],
  cookie: string,
  csrfToken: string
) {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return;
  const sql = neon(dbUrl);

  const storeSlug = resolveStoreSlug(brandName);

  // Try to get individual commission records for accurate per-order totals
  const individualCommissions = await fetchIndividualCommissions(
    partnershipId, cookie, csrfToken, lastSyncedAt, deltaOrders
  );

  if (individualCommissions && individualCommissions.length > 0) {
    // Use individual per-order commissions — most accurate path
    const ordersToSave = individualCommissions.slice(0, deltaOrders);
    const windowStart = lastSyncedAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const recentClicks = await sql`
      SELECT click_id, user_id, timestamp, product_name, cart_items
      FROM clicks
      WHERE store_slug = ${storeSlug}
        AND user_id IS NOT NULL
        AND timestamp >= ${windowStart}
        AND timestamp <= ${now}
        AND click_id NOT IN (
          SELECT via_click_id FROM conversions WHERE via_click_id IS NOT NULL AND store_slug = ${storeSlug}
        )
      ORDER BY timestamp DESC
      LIMIT ${ordersToSave.length}
    `;

    for (let i = 0; i < ordersToSave.length; i++) {
      const { commissionUsdAmount, earnedAt, productName: collabsProductName, shopifyOrderName } = ordersToSave[i];
      const orderTotal = calculateOrderTotal(commissionUsdAmount, commissionRules);
      const click = recentClicks[i] ?? null;
      // Prefer Shopify order name for a stable, meaningful ID; fall back to synthetic
      const orderIdBase = shopifyOrderName
        ? `collabs-${storeSlug}-${shopifyOrderName.replace(/^#/, "")}`
        : `collabs-${partnershipId}-order-${prevOrderCount + i}`;
      const orderId = orderIdBase;
      const conversionId = `collabs_${partnershipId}_${Date.now()}_${i}`;
      const ts = earnedAt || now;
      // Product name priority: Collabs API line item > VYA click > generic fallback
      const resolvedProductName = collabsProductName ?? (click?.product_name as string | null) ?? "Order via Shopify Collabs";

      await sql`
        INSERT INTO conversions (
          conversion_id, timestamp, order_id, order_total, currency,
          items, via_click_id, store_slug, store_name, matched, matched_click_data, user_id
        )
        VALUES (
          ${conversionId}, ${ts}, ${orderId}, ${orderTotal}, 'USD',
          ${JSON.stringify([{ productName: resolvedProductName, quantity: 1, price: orderTotal }])},
          ${click ? (click.click_id as string) : null},
          ${storeSlug}, ${brandName}, true,
          ${JSON.stringify({
            source: "shopify-collabs",
            partnershipId,
            commissionUsd: commissionUsdAmount,
            commissionRate: commissionRules.map(r => r.value),
            ...(shopifyOrderName ? { shopifyOrderName } : {}),
            ...(collabsProductName ? { productName: collabsProductName } : {}),
          })},
          ${click ? (click.user_id as string) : null}
        )
        ON CONFLICT (order_id, store_slug) DO NOTHING
      `;
    }
    return;
  }

  // Fallback: delta-based approach using actual commission rates
  const commissionUSD = convertCurrencyToUSD(deltaCommission, currency);
  const perOrderTotal = calculateOrderTotal(commissionUSD / deltaOrders, commissionRules);

  // Look for unmatched clicks to this store since the last sync
  // (fall back to 24h window if this is the first sync)
  const windowStart = lastSyncedAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const recentClicks = await sql`
    SELECT click_id, user_id, timestamp, product_name, cart_items
    FROM clicks
    WHERE store_slug = ${storeSlug}
      AND user_id IS NOT NULL
      AND timestamp >= ${windowStart}
      AND timestamp <= ${now}
      AND click_id NOT IN (
        SELECT via_click_id FROM conversions
        WHERE via_click_id IS NOT NULL AND store_slug = ${storeSlug}
      )
    ORDER BY timestamp DESC
    LIMIT ${deltaOrders}
  `;

  // Create one conversion row per order, matched to a click where possible
  for (let i = 0; i < deltaOrders; i++) {
    const click = recentClicks[i] ?? null;
    // Deterministic ID based on partnership + cumulative order index so ON CONFLICT
    // correctly deduplicates if this batch is retried after a partial failure.
    const orderId = `collabs-${partnershipId}-order-${prevOrderCount + i}`;
    const conversionId = `collabs_${partnershipId}_${Date.now()}_${i}`;

    await sql`
      INSERT INTO conversions (
        conversion_id, timestamp, order_id, order_total, currency,
        items, via_click_id, store_slug, store_name, matched, matched_click_data, user_id
      )
      VALUES (
        ${conversionId}, ${now}, ${orderId}, ${perOrderTotal}, 'USD',
        ${(() => {
          if (click?.cart_items && Array.isArray(click.cart_items) && click.cart_items.length > 1) {
            return JSON.stringify(
              (click.cart_items as { id: string; name: string; price: number }[]).map((ci) => ({
                productName: ci.name,
                quantity: 1,
                price: ci.price,
              }))
            );
          }
          return JSON.stringify([{ productName: click ? (click.product_name as string) : `Order via Shopify Collabs`, quantity: 1, price: perOrderTotal }]);
        })()},
        ${click ? (click.click_id as string) : null},
        ${storeSlug}, ${brandName}, true,
        ${JSON.stringify({ source: "shopify-collabs", partnershipId, deltaOrders, deltaCommission })},
        ${click ? (click.user_id as string) : null}
      )
      ON CONFLICT (order_id, store_slug) DO NOTHING
    `;
  }
}

/**
 * Retroactively match existing collabs conversions that have no user_id.
 * For each, look for a click to the same store within 48h before the conversion.
 */
async function retroactivelyMatchCollabsConversions() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return 0;
  const sql = neon(dbUrl);

  const unmatched = await sql`
    SELECT id, store_slug, timestamp
    FROM conversions
    WHERE user_id IS NULL
      AND matched_click_data->>'source' = 'shopify-collabs'
    ORDER BY timestamp DESC
    LIMIT 200
  `;

  let matchedCount = 0;

  for (const conv of unmatched) {
    const windowStart = new Date(new Date(conv.timestamp as string).getTime() - 48 * 60 * 60 * 1000).toISOString();

    const clicks = await sql`
      SELECT click_id, user_id
      FROM clicks
      WHERE store_slug = ${conv.store_slug as string}
        AND user_id IS NOT NULL
        AND timestamp >= ${windowStart}
        AND timestamp <= ${conv.timestamp as string}
        AND click_id NOT IN (
          SELECT via_click_id FROM conversions WHERE via_click_id IS NOT NULL
        )
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    if (clicks.length > 0 && clicks[0].user_id) {
      await sql`
        UPDATE conversions
        SET user_id = ${clicks[0].user_id as string}, via_click_id = ${clicks[0].click_id as string}
        WHERE id = ${conv.id as number}
      `;
      matchedCount++;
    }
  }

  return matchedCount;
}

const COLLABS_GRAPHQL_URL = "https://api.collabs.shopify.com/creator/graphql";

const PARTNERSHIPS_QUERY = `query PartnershipsAnalyticsQuery($first: Int, $last: Int, $after: String, $before: String) {
  partnershipsForPayouts(
    first: $first
    last: $last
    after: $after
    before: $before
  ) {
    nodes {
      id
      partnershipBrand {
        logoUrl
        backgroundColor
        name
        __typename
      }
      totalCommissionEarned {
        displayValue
        symbol
        currency
        __typename
      }
      totalLinkVisits
      totalOrders
      affiliateOffer {
        commissionRules {
          __typename
          ... on GlobalCommissionRule { value }
          ... on CollectionCommissionRule { value }
          ... on ProductCommissionRule { value }
        }
      }
      __typename
    }
    __typename
  }
}`;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [cookie, csrfToken] = await Promise.all([
    getSetting("collabs_cookie"),
    getSetting("collabs_csrf_token"),
  ]);

  if (!cookie || !csrfToken) {
    console.log("[Sync Collabs Revenue] No credentials stored — skipping");
    return NextResponse.json({ skipped: true, reason: "No credentials" });
  }

  let res: Response;
  try {
    res = await fetch(COLLABS_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cookie": cookie,
        "x-csrf-token": csrfToken,
        "origin": "https://collabs.shopify.com",
        "referer": "https://collabs.shopify.com/",
        "x-client-type": "web",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        operationName: "PartnershipsAnalyticsQuery",
        variables: { after: null, before: null, first: 50, last: null },
        query: PARTNERSHIPS_QUERY,
      }),
    });
  } catch (err) {
    console.error("[Sync Collabs Revenue] Fetch failed:", err);
    return NextResponse.json({ error: "Fetch failed", detail: String(err) }, { status: 502 });
  }

  if (!res.ok) {
    console.error(`[Sync Collabs Revenue] Shopify returned ${res.status} — credentials may have expired`);
    return NextResponse.json({ error: `Shopify returned ${res.status}` }, { status: res.status });
  }

  const newCsrfToken = res.headers.get("x-csrf-token");
  if (newCsrfToken) {
    await saveSetting("collabs_csrf_token", newCsrfToken);
  }

  const json = await res.json();
  if (json.errors) {
    console.error("[Sync Collabs Revenue] GraphQL errors:", json.errors);
    return NextResponse.json({ error: "GraphQL errors", detail: json.errors }, { status: 401 });
  }

  const nodes = json?.data?.partnershipsForPayouts?.nodes ?? [];
  const partnerships = nodes.map((node: Record<string, unknown>) => {
    const brand = node.partnershipBrand as Record<string, unknown>;
    const commission = node.totalCommissionEarned as Record<string, unknown>;
    const offer = node.affiliateOffer as Record<string, unknown> | null;
    const rules = (offer?.commissionRules as CommissionRule[] | null) ?? [];
    return {
      id: node.id as string,
      name: brand?.name as string,
      logoUrl: brand?.logoUrl as string | null,
      totalCommissionEarned: commission?.displayValue as string,
      currency: commission?.currency as string,
      totalLinkVisits: node.totalLinkVisits as number,
      totalOrders: node.totalOrders as number,
      commissionRules: rules,
    };
  });

  // Load previous snapshot to compute deltas
  const [prevRaw, lastSyncedAt] = await Promise.all([
    getSetting("collabs_data"),
    getSetting("collabs_last_synced_at"),
  ]);
  const prevMap = new Map<string, { totalOrders: number; totalCommissionEarned: string }>();
  if (prevRaw) {
    try {
      const prev = JSON.parse(prevRaw) as Array<{ id: string; totalOrders: number; totalCommissionEarned: string }>;
      for (const p of prev) prevMap.set(p.id, p);
    } catch {}
  }

  const now = new Date().toISOString();
  let newOrdersRecorded = 0;
  let dbWriteFailed = false;

  for (const p of partnerships) {
    const prev = prevMap.get(p.id);
    const prevOrders = prev?.totalOrders ?? 0;
    const prevCommission = parseCommission(prev?.totalCommissionEarned ?? "0");
    const currOrders = p.totalOrders ?? 0;
    const currCommission = parseCommission(p.totalCommissionEarned ?? "0");

    const deltaOrders = currOrders - prevOrders;
    const deltaCommission = currCommission - prevCommission;

    if (deltaOrders > 0 && deltaCommission > 0) {
      try {
        await saveCollabsConversions(p.id, p.name, deltaOrders, deltaCommission, p.currency ?? "USD", now, lastSyncedAt, prevOrders, p.commissionRules ?? [], cookie, csrfToken);
        newOrdersRecorded += deltaOrders;
        console.log(`[Sync Collabs Revenue] ${p.name}: +${deltaOrders} orders, +${deltaCommission.toFixed(2)} ${p.currency ?? "USD"} commission, rates: [${(p.commissionRules ?? []).map((r: CommissionRule) => r.value + "%").join(", ")}]`);
      } catch (err) {
        dbWriteFailed = true;
        console.error(`[Sync Collabs Revenue] DB write failed for ${p.name}:`, err);
      }
    }
  }

  // Only advance the snapshot if all DB writes succeeded — if any failed (e.g. quota exceeded),
  // keep the old snapshot so the next run retries the missed orders.
  if (!dbWriteFailed) {
    await saveSetting("collabs_last_synced_at", now);
    await saveSetting("collabs_data", JSON.stringify(partnerships));
  } else {
    console.warn("[Sync Collabs Revenue] Snapshot NOT advanced due to DB write failures — will retry on next run");
  }

  // Retroactively match any older collabs conversions that still have no user_id
  const retroMatched = await retroactivelyMatchCollabsConversions();

  console.log(`[Sync Collabs Revenue] Synced ${partnerships.length} partnerships, recorded ${newOrdersRecorded} new orders, retro-matched ${retroMatched} existing orders${dbWriteFailed ? " (snapshot NOT advanced — DB errors)" : ""}`);
  return NextResponse.json({ ok: !dbWriteFailed, partnerships: partnerships.length, newOrdersRecorded, retroMatched, syncedAt: now, snapshotAdvanced: !dbWriteFailed });
}
