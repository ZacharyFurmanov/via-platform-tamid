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

async function saveCollabsConversion(
  partnershipId: string,
  brandName: string,
  deltaOrders: number,
  deltaCommission: number,
  now: string
) {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return;
  const sql = neon(dbUrl);

  const storeSlug = resolveStoreSlug(brandName);
  const estimatedTotal = estimateRevenue(deltaCommission);
  const orderId = `collabs-${partnershipId}-${Date.now()}`;
  const conversionId = `collabs_${partnershipId}_${Date.now()}`;

  await sql`
    INSERT INTO conversions (
      conversion_id, timestamp, order_id, order_total, currency,
      items, via_click_id, store_slug, store_name, matched, matched_click_data
    )
    VALUES (
      ${conversionId}, ${now}, ${orderId}, ${estimatedTotal}, 'USD',
      ${JSON.stringify([{ productName: `${deltaOrders} order${deltaOrders !== 1 ? "s" : ""} via Shopify Collabs`, quantity: deltaOrders, price: estimatedTotal }])},
      NULL, ${storeSlug}, ${brandName}, true,
      ${JSON.stringify({ source: "shopify-collabs", partnershipId, deltaOrders, deltaCommission })}
    )
    ON CONFLICT (order_id, store_slug) DO NOTHING
  `;
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
  const prevRaw = await getSetting("collabs_data");
  const prevMap = new Map<string, { totalOrders: number; totalCommissionEarned: string }>();
  if (prevRaw) {
    try {
      const prev = JSON.parse(prevRaw) as Array<{ id: string; totalOrders: number; totalCommissionEarned: string }>;
      for (const p of prev) prevMap.set(p.id, p);
    } catch {}
  }

  const now = new Date().toISOString();
  let newOrdersRecorded = 0;

  for (const p of partnerships) {
    const prev = prevMap.get(p.id);
    const prevOrders = prev?.totalOrders ?? 0;
    const prevCommission = parseCommission(prev?.totalCommissionEarned ?? "0");
    const currOrders = p.totalOrders ?? 0;
    const currCommission = parseCommission(p.totalCommissionEarned ?? "0");

    const deltaOrders = currOrders - prevOrders;
    const deltaCommission = currCommission - prevCommission;

    if (deltaOrders > 0 && deltaCommission > 0) {
      await saveCollabsConversion(p.id, p.name, deltaOrders, deltaCommission, now);
      newOrdersRecorded += deltaOrders;
      console.log(`[Sync Collabs Revenue] ${p.name}: +${deltaOrders} orders, +$${deltaCommission.toFixed(2)} commission`);
    }
  }

  await saveSetting("collabs_last_synced_at", now);
  await saveSetting("collabs_data", JSON.stringify(partnerships));

  console.log(`[Sync Collabs Revenue] Synced ${partnerships.length} partnerships, recorded ${newOrdersRecorded} new orders`);
  return NextResponse.json({ ok: true, partnerships: partnerships.length, newOrdersRecorded, syncedAt: now });
}
