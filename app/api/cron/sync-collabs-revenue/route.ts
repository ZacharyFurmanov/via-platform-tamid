import { NextResponse } from "next/server";
import { saveSetting, getSetting } from "@/app/lib/settings-db";

export const maxDuration = 60;

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

  await saveSetting("collabs_last_synced_at", new Date().toISOString());
  await saveSetting("collabs_data", JSON.stringify(partnerships));

  console.log(`[Sync Collabs Revenue] Synced ${partnerships.length} partnerships`);
  return NextResponse.json({ ok: true, partnerships: partnerships.length, syncedAt: new Date().toISOString() });
}
