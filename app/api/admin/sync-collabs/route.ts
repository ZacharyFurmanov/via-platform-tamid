import { NextRequest, NextResponse } from "next/server";
import { saveSetting, getSetting } from "@/app/lib/settings-db";

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
    // Likely an auth failure
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

  return NextResponse.json({
    ok: true,
    syncedAt: new Date().toISOString(),
    partnerships,
  });
}
