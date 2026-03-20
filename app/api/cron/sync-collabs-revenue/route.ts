import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { saveSetting, getSetting } from "@/app/lib/settings-db";
import { stores } from "@/app/lib/stores";

export const maxDuration = 60;

// Build a lowercase name → slug map from our store config
const storeNameToSlug = new Map<string, string>(
  stores.map((s) => [s.name.toLowerCase(), s.slug])
);

function resolveStoreSlug(brandName: string): string {
  const key = brandName.toLowerCase();
  return storeNameToSlug.get(key) ?? brandName.toLowerCase().replace(/\s+/g, "-");
}

function parseCommission(displayValue: string): number {
  const n = parseFloat(displayValue.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

/** Reverse-calculate order total from commission earned.
 *  Uses 7% as the base rate (most vintage items are under $1k).
 *  If the implied total exceeds $1k we step up to 5%, and >$5k to 3%. */
function estimateRevenue(commission: number): number {
  if (commission <= 0) return 0;
  // Try 7% first
  let implied = commission / 0.07;
  if (implied < 1000) return implied;
  // Try 5%
  implied = commission / 0.05;
  if (implied <= 5000) return implied;
  // Use 3%
  return commission / 0.03;
}

async function saveCollabsConversions(
  partnershipId: string,
  brandName: string,
  deltaOrders: number,
  deltaCommission: number,
  now: string,
  lastSyncedAt: string | null
) {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return;
  const sql = neon(dbUrl);

  const storeSlug = resolveStoreSlug(brandName);
  const perOrderTotal = estimateRevenue(deltaCommission) / deltaOrders;

  // Look for unmatched clicks to this store since the last sync
  // (fall back to 24h window if this is the first sync)
  const windowStart = lastSyncedAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const recentClicks = await sql`
    SELECT click_id, user_id, timestamp, product_name
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
    const orderId = `collabs-${partnershipId}-${Date.now()}-${i}`;
    const conversionId = `collabs_${partnershipId}_${Date.now()}_${i}`;

    await sql`
      INSERT INTO conversions (
        conversion_id, timestamp, order_id, order_total, currency,
        items, via_click_id, store_slug, store_name, matched, matched_click_data, user_id
      )
      VALUES (
        ${conversionId}, ${now}, ${orderId}, ${perOrderTotal}, 'USD',
        ${JSON.stringify([{ productName: click ? (click.product_name as string) : `Order via Shopify Collabs`, quantity: 1, price: perOrderTotal }])},
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
    return {
      id: node.id as string,
      name: brand?.name as string,
      logoUrl: brand?.logoUrl as string | null,
      totalCommissionEarned: commission?.displayValue as string,
      currency: commission?.currency as string,
      totalLinkVisits: node.totalLinkVisits as number,
      totalOrders: node.totalOrders as number,
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
        await saveCollabsConversions(p.id, p.name, deltaOrders, deltaCommission, now, lastSyncedAt);
        newOrdersRecorded += deltaOrders;
        console.log(`[Sync Collabs Revenue] ${p.name}: +${deltaOrders} orders, +$${deltaCommission.toFixed(2)} commission`);
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
