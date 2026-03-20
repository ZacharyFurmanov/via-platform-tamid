import { NextRequest, NextResponse } from "next/server";
import { saveSetting, getSetting } from "@/app/lib/settings-db";
import { neon } from "@neondatabase/serverless";
import { stores } from "@/app/lib/stores";

function hashPassword(password: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(password).digest("hex");
}
function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const token = request.cookies.get("via_admin_token")?.value;
  return token === hashPassword(adminPassword);
}

const COLLABS_GRAPHQL_URL = "https://api.collabs.shopify.com/creator/graphql";

const PARTNERSHIPS_QUERY = `query PartnershipsAnalyticsQuery($first: Int, $last: Int, $after: String, $before: String) {
  partnershipsForPayouts(
    first: $first
    last: $last
    after: $after
    before: $before
  ) {
    totalCount
    pageInfo {
      hasNextPage
      hasPreviousPage
      endCursor
      startCursor
      __typename
    }
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

const storeNameToSlug = new Map<string, string>(
  stores.map((s) => [s.name.toLowerCase(), s.slug])
);
function resolveStoreSlug(brandName: string): string {
  return storeNameToSlug.get(brandName.toLowerCase()) ?? brandName.toLowerCase().replace(/\s+/g, "-");
}
function parseCommission(displayValue: string): number {
  const n = parseFloat((displayValue ?? "").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}
function estimateRevenue(commission: number): number {
  if (commission <= 0) return 0;
  const implied = commission / 0.07;
  if (implied < 1000) return implied;
  const implied5 = commission / 0.05;
  if (implied5 <= 5000) return implied5;
  return commission / 0.03;
}
// Extract numeric ID from Shopify GIDs like "gid://shopify/Collabs/Partnership/5715086"
function extractNumericId(gid: string): string {
  const parts = gid.split("/");
  return parts[parts.length - 1] ?? gid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
}

/** Save credentials (cookie string + csrf token) */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cookie, csrfToken } = await request.json();
  if (!cookie || !csrfToken) {
    return NextResponse.json({ error: "Missing cookie or csrfToken" }, { status: 400 });
  }

  await Promise.all([
    saveSetting("collabs_cookie", cookie),
    saveSetting("collabs_csrf_token", csrfToken),
  ]);

  return NextResponse.json({ ok: true });
}

/** Trigger a sync using stored credentials */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [cookie, csrfToken] = await Promise.all([
    getSetting("collabs_cookie"),
    getSetting("collabs_csrf_token"),
  ]);

  if (!cookie || !csrfToken) {
    return NextResponse.json(
      { error: "No credentials stored. Please update your Shopify Collabs credentials." },
      { status: 400 }
    );
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
    return NextResponse.json({ error: "Failed to reach Shopify Collabs API", detail: String(err) }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `Shopify Collabs returned ${res.status}. Your session may have expired — please refresh your credentials.` },
      { status: res.status }
    );
  }

  // Rotate the CSRF token — Shopify returns a fresh one with each response
  const newCsrfToken = res.headers.get("x-csrf-token");
  if (newCsrfToken) {
    await saveSetting("collabs_csrf_token", newCsrfToken);
  }

  const json = await res.json();

  if (json.errors) {
    return NextResponse.json(
      { error: "Shopify Collabs returned errors. Your session may have expired.", detail: json.errors },
      { status: 401 }
    );
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

  // Cache the result
  await saveSetting("collabs_last_synced_at", new Date().toISOString());
  await saveSetting("collabs_data", JSON.stringify(partnerships));

  // ── Auto-create conversion records for new orders ─────────────────────────
  // prevCounts tracks the Shopify order total we last saw per partnership (numeric ID).
  // Rules:
  //   - If a partnership is NOT in prevCounts, it's the first time we've seen it.
  //     Save the current count as the baseline and create NO records (those orders
  //     are already tracked via webhook / backfill or will be handled manually).
  //   - If it IS in prevCounts, only create records for the delta (new orders since last sync).
  let prevCounts: Record<string, { orders: number; commission: number }> = {};
  try {
    const raw = await getSetting("collabs_prev_counts");
    if (raw) prevCounts = JSON.parse(raw);
  } catch {}

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let newConversionsCreated = 0;

  // Always save updated counts so the next sync has a correct baseline
  const newCounts: Record<string, { orders: number; commission: number }> = {};
  for (const p of partnerships) {
    newCounts[extractNumericId(p.id)] = {
      orders: p.totalOrders ?? 0,
      commission: parseCommission(p.totalCommissionEarned),
    };
  }

  if (dbUrl) {
    const sql = neon(dbUrl);
    const now = new Date().toISOString();

    for (const p of partnerships) {
      const numericId = extractNumericId(p.id);
      const currentOrders = p.totalOrders ?? 0;
      const currentCommission = parseCommission(p.totalCommissionEarned);

      // First time seeing this partnership — initialize baseline, skip record creation
      if (!(numericId in prevCounts)) continue;

      const prevOrders = prevCounts[numericId].orders;
      const prevCommission = prevCounts[numericId].commission ?? 0;
      const deltaOrders = currentOrders - prevOrders;

      if (deltaOrders <= 0) continue;

      // Estimate revenue for the new orders
      const deltaCommission = Math.max(0, currentCommission - prevCommission);
      const avgPerOrder = currentOrders > 0 ? currentCommission / currentOrders : 0;
      const deltaRevenue = deltaCommission > 0
        ? estimateRevenue(deltaCommission)
        : estimateRevenue(avgPerOrder) * deltaOrders;

      // Use at least $1 so the order appears (order_total > 0 filter); admin can correct via Match
      const perOrderRevenue = Math.max(1, deltaRevenue / deltaOrders);
      const storeSlug = resolveStoreSlug(p.name);
      const storeName = stores.find(s => s.slug === storeSlug)?.name ?? p.name;

      // Create one record per new order, numbered from where we left off
      for (let i = 0; i < deltaOrders; i++) {
        const orderNum = prevOrders + i + 1;
        const orderId = `collabs-${numericId}-${orderNum}`;
        const conversionId = `collabs_${numericId}_${orderNum}`;

        await sql`
          INSERT INTO conversions (
            conversion_id, timestamp, order_id, order_total, currency,
            store_slug, store_name, matched, matched_click_data
          )
          VALUES (
            ${conversionId}, ${now}, ${orderId}, ${Math.round(perOrderRevenue * 100) / 100}, 'USD',
            ${storeSlug}, ${storeName}, false, NULL
          )
          ON CONFLICT (conversion_id) DO NOTHING
        `;

        newConversionsCreated++;
      }
    }
  }

  await saveSetting("collabs_prev_counts", JSON.stringify(newCounts));

  return NextResponse.json({
    ok: true,
    syncedAt: new Date().toISOString(),
    partnerships,
    newConversionsCreated,
  });
}
