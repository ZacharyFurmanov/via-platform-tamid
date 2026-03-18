import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

function getCutoff(range: string): Date | null {
  const now = new Date();
  if (range === "7d") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (range === "30d") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") ?? "7d";

    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) {
      return NextResponse.json({ error: "No database URL configured" }, { status: 500 });
    }

    const sql = neon(dbUrl);
    const cutoff = getCutoff(range);
    const cutoffIso = cutoff ? cutoff.toISOString() : null;

    // ── KPIs ─────────────────────────────────────────────────────────────────

    const [
      kpiClicksResult,
      kpiViewsResult,
      kpiRevenueResult,
      kpiCustomersResult,
      kpiSignupsResult,
      topClicksResult,
      topViewsResult,
      topStoresResult,
      signupsByDayResult,
      referralResult,
      recentActivityResult,
      recentConversionsResult,
      inventorySummaryResult,
      inventoryByStoreResult,
      collabsDataResult,
    ] = await Promise.all([
      // totalClicks
      cutoffIso
        ? sql`SELECT COUNT(*)::int AS total FROM clicks WHERE timestamp >= ${cutoffIso}`
        : sql`SELECT COUNT(*)::int AS total FROM clicks`,

      // totalViews
      cutoffIso
        ? sql`SELECT COUNT(*)::int AS total FROM product_views WHERE timestamp >= ${cutoffIso}`
        : sql`SELECT COUNT(*)::int AS total FROM product_views`,

      // totalRevenue + totalConversions + matched breakdown
      cutoffIso
        ? sql`SELECT COALESCE(SUM(order_total), 0)::float AS revenue, COUNT(*)::int AS conversions, COUNT(*) FILTER (WHERE matched = true)::int AS matched, COUNT(*) FILTER (WHERE matched = false OR matched IS NULL)::int AS unmatched FROM conversions WHERE order_total > 0 AND timestamp >= ${cutoffIso}`
        : sql`SELECT COALESCE(SUM(order_total), 0)::float AS revenue, COUNT(*)::int AS conversions, COUNT(*) FILTER (WHERE matched = true)::int AS matched, COUNT(*) FILTER (WHERE matched = false OR matched IS NULL)::int AS unmatched FROM conversions WHERE order_total > 0`,

      // totalCustomers (pilot_access + waitlist deduped) + approvedCustomers
      sql`
        SELECT
          (SELECT COUNT(DISTINCT email) FROM (
            SELECT LOWER(email) AS email FROM pilot_access
            UNION
            SELECT LOWER(email) AS email FROM waitlist
          ) AS all_emails)::int AS total,
          (SELECT COUNT(*) FROM pilot_access WHERE status = 'approved')::int AS approved,
          (SELECT COUNT(*) FROM pilot_access)::int AS pilot_total,
          (SELECT COUNT(*) FROM waitlist
            WHERE LOWER(email) NOT IN (SELECT LOWER(email) FROM pilot_access))::int AS waitlist_only
      `,

      // newSignupsThisWeek (UNION dedup by email, last 7 days)
      sql`
        SELECT COUNT(*)::int AS total FROM (
          SELECT email FROM pilot_access WHERE created_at >= NOW() - INTERVAL '7 days'
          UNION
          SELECT email FROM waitlist WHERE signup_date >= NOW() - INTERVAL '7 days'
        ) AS combined
      `,

      // topProductsByClicks
      cutoffIso
        ? sql`
            SELECT
              product_id AS "productId",
              product_name AS name,
              store,
              COUNT(*)::int AS clicks
            FROM clicks
            WHERE timestamp >= ${cutoffIso}
            GROUP BY product_id, product_name, store
            ORDER BY clicks DESC
            LIMIT 15
          `
        : sql`
            SELECT
              product_id AS "productId",
              product_name AS name,
              store,
              COUNT(*)::int AS clicks
            FROM clicks
            GROUP BY product_id, product_name, store
            ORDER BY clicks DESC
            LIMIT 15
          `,

      // topProductsByViews
      cutoffIso
        ? sql`
            SELECT
              pv.product_id AS "productId",
              p.title AS name,
              p.store_name AS store,
              COUNT(*)::int AS views
            FROM product_views pv
            LEFT JOIN products p ON (p.store_slug || '-' || p.id::text) = pv.product_id
            WHERE pv.timestamp >= ${cutoffIso}
            GROUP BY pv.product_id, p.title, p.store_name
            ORDER BY views DESC
            LIMIT 15
          `
        : sql`
            SELECT
              pv.product_id AS "productId",
              p.title AS name,
              p.store_name AS store,
              COUNT(*)::int AS views
            FROM product_views pv
            LEFT JOIN products p ON (p.store_slug || '-' || p.id::text) = pv.product_id
            GROUP BY pv.product_id, p.title, p.store_name
            ORDER BY views DESC
            LIMIT 15
          `,

      // topStores — clicks + conversions + revenue joined by store slug
      cutoffIso
        ? sql`
            WITH click_counts AS (
              SELECT store AS store_slug, COUNT(*)::int AS clicks
              FROM clicks
              WHERE timestamp >= ${cutoffIso}
              GROUP BY store
            ),
            conv_stats AS (
              SELECT store_slug, COUNT(*)::int AS conversions, COALESCE(SUM(order_total), 0)::float AS revenue
              FROM conversions
              WHERE order_total > 0 AND timestamp >= ${cutoffIso}
              GROUP BY store_slug
            )
            SELECT
              COALESCE(c.store_slug, v.store_slug) AS store,
              COALESCE(c.clicks, 0) AS clicks,
              COALESCE(v.conversions, 0) AS conversions,
              COALESCE(v.revenue, 0) AS revenue
            FROM click_counts c
            FULL OUTER JOIN conv_stats v ON c.store_slug = v.store_slug
            ORDER BY clicks DESC
          `
        : sql`
            WITH click_counts AS (
              SELECT store AS store_slug, COUNT(*)::int AS clicks
              FROM clicks
              GROUP BY store
            ),
            conv_stats AS (
              SELECT store_slug, COUNT(*)::int AS conversions, COALESCE(SUM(order_total), 0)::float AS revenue
              FROM conversions
              WHERE order_total > 0
              GROUP BY store_slug
            )
            SELECT
              COALESCE(c.store_slug, v.store_slug) AS store,
              COALESCE(c.clicks, 0) AS clicks,
              COALESCE(v.conversions, 0) AS conversions,
              COALESCE(v.revenue, 0) AS revenue
            FROM click_counts c
            FULL OUTER JOIN conv_stats v ON c.store_slug = v.store_slug
            ORDER BY clicks DESC
          `,

      // signupsByDay — for "all" use last 60 days, otherwise use cutoff
      (() => {
        const dayCutoff = range === "all"
          ? new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
          : cutoffIso;

        return dayCutoff
          ? sql`
              SELECT
                TO_CHAR(day::date, 'YYYY-MM-DD') AS date,
                COUNT(*)::int AS count
              FROM (
                SELECT created_at AS day, email FROM pilot_access WHERE created_at >= ${dayCutoff}
                UNION
                SELECT signup_date AS day, email FROM waitlist WHERE signup_date >= ${dayCutoff}
              ) AS combined
              GROUP BY day::date
              ORDER BY day::date ASC
            `
          : sql`
              SELECT
                TO_CHAR(day::date, 'YYYY-MM-DD') AS date,
                COUNT(*)::int AS count
              FROM (
                SELECT created_at AS day, email FROM pilot_access
                UNION
                SELECT signup_date AS day, email FROM waitlist
              ) AS combined
              GROUP BY day::date
              ORDER BY day::date ASC
            `;
      })(),

      // referralLeaderboard
      sql`
        SELECT
          pa.referral_code AS code,
          pa.email,
          pa.first_name AS "firstName",
          pa.last_name AS "lastName",
          COUNT(ref.id)::int AS "referralCount"
        FROM pilot_access pa
        LEFT JOIN pilot_access ref ON ref.referred_by = pa.referral_code
        WHERE pa.referral_code IS NOT NULL
        GROUP BY pa.referral_code, pa.email, pa.first_name, pa.last_name
        HAVING COUNT(ref.id) > 0
        ORDER BY "referralCount" DESC
        LIMIT 15
      `,

      // recentActivity — last 30 clicks
      sql`
        SELECT
          'click' AS type,
          timestamp,
          product_name AS "productName",
          store,
          product_id AS "productId"
        FROM clicks
        ORDER BY timestamp DESC
        LIMIT 30
      `,

      // recentConversions — last 50 orders with attribution
      cutoffIso
        ? sql`
            SELECT
              conversion_id,
              timestamp,
              order_id,
              order_total::float,
              store_slug,
              store_name,
              matched,
              via_click_id,
              matched_click_data
            FROM conversions
            WHERE order_total > 0 AND timestamp >= ${cutoffIso}
            ORDER BY timestamp DESC
            LIMIT 50
          `
        : sql`
            SELECT
              conversion_id,
              timestamp,
              order_id,
              order_total::float,
              store_slug,
              store_name,
              matched,
              via_click_id,
              matched_click_data
            FROM conversions
            WHERE order_total > 0
            ORDER BY timestamp DESC
            LIMIT 50
          `,

      // inventorySummary
      sql`
        WITH converted AS (
          SELECT
            store_slug,
            price * CASE currency
              WHEN 'GBP' THEN 1.26
              WHEN 'EUR' THEN 1.08
              WHEN 'CAD' THEN 0.74
              WHEN 'AUD' THEN 0.65
              ELSE 1
            END AS price_usd
          FROM products
          WHERE price > 0
        )
        SELECT
          COUNT(*)::int AS product_count,
          COALESCE(SUM(price_usd), 0)::numeric AS inventory_value,
          COALESCE(SUM(
            CASE
              WHEN price_usd < 1000 THEN price_usd * 0.07
              WHEN price_usd <= 5000 THEN price_usd * 0.05
              ELSE price_usd * 0.03
            END
          ), 0)::numeric AS potential_commission,
          COUNT(CASE WHEN price_usd < 1000 THEN 1 END)::int AS tier1_count,
          COUNT(CASE WHEN price_usd >= 1000 AND price_usd <= 5000 THEN 1 END)::int AS tier2_count,
          COUNT(CASE WHEN price_usd > 5000 THEN 1 END)::int AS tier3_count
        FROM converted
      `,

      // inventoryByStore
      sql`
        WITH converted AS (
          SELECT
            store_slug,
            price * CASE currency
              WHEN 'GBP' THEN 1.26
              WHEN 'EUR' THEN 1.08
              WHEN 'CAD' THEN 0.74
              WHEN 'AUD' THEN 0.65
              ELSE 1
            END AS price_usd
          FROM products
          WHERE price > 0
        )
        SELECT
          store_slug,
          COUNT(*)::int AS product_count,
          COALESCE(SUM(price_usd), 0)::numeric AS inventory_value,
          COALESCE(SUM(
            CASE
              WHEN price_usd < 1000 THEN price_usd * 0.07
              WHEN price_usd <= 5000 THEN price_usd * 0.05
              ELSE price_usd * 0.03
            END
          ), 0)::numeric AS potential_commission
        FROM converted
        GROUP BY store_slug
        ORDER BY inventory_value DESC
      `,

      // collabsData from settings cache
      sql`SELECT value FROM app_settings WHERE key = 'collabs_data'`.catch(() => []),
    ]);

    // Parse Shopify Collabs cached data
    let collabsTotalOrders = 0;
    let collabsEstimatedRevenue = 0;
    try {
      const rawCollabs = collabsDataResult[0]?.value as string | undefined;
      if (rawCollabs) {
        const partnerships = JSON.parse(rawCollabs) as Array<{
          totalOrders: number;
          totalCommissionEarned: string; // e.g. "$18.20"
        }>;
        for (const p of partnerships) {
          collabsTotalOrders += p.totalOrders ?? 0;
          // Parse commission display string — strip currency symbols, keep digits and dot
          const commissionStr = p.totalCommissionEarned ?? "";
          const commissionNum = parseFloat(commissionStr.replace(/[^0-9.]/g, ""));
          if (!isNaN(commissionNum) && commissionNum > 0) {
            // Back-calculate order total: VYA earns 7% on orders under $1k
            collabsEstimatedRevenue += commissionNum / 0.07;
          }
        }
      }
    } catch {}

    const webhookRevenue = (kpiRevenueResult[0]?.revenue as number) ?? 0;
    const webhookOrders = (kpiRevenueResult[0]?.conversions as number) ?? 0;

    const kpis = {
      totalClicks: (kpiClicksResult[0]?.total as number) ?? 0,
      totalViews: (kpiViewsResult[0]?.total as number) ?? 0,
      totalRevenue: Math.max(webhookRevenue, collabsEstimatedRevenue),
      totalConversions: Math.max(webhookOrders, collabsTotalOrders),
      matchedConversions: (kpiRevenueResult[0]?.matched as number) ?? 0,
      unmatchedConversions: (kpiRevenueResult[0]?.unmatched as number) ?? 0,
      totalCustomers: (kpiCustomersResult[0]?.total as number) ?? 0,
      approvedCustomers: (kpiCustomersResult[0]?.approved as number) ?? 0,
      pilotTotal: (kpiCustomersResult[0]?.pilot_total as number) ?? 0,
      waitlistOnly: (kpiCustomersResult[0]?.waitlist_only as number) ?? 0,
      newSignupsThisWeek: (kpiSignupsResult[0]?.total as number) ?? 0,
      collabsTotalOrders,
      collabsEstimatedRevenue: Math.round(collabsEstimatedRevenue * 100) / 100,
    };

    const invS = inventorySummaryResult[0];
    const inventory = {
      productCount: (invS?.product_count as number) ?? 0,
      inventoryValue: Number(invS?.inventory_value ?? 0),
      potentialCommission: Number(invS?.potential_commission ?? 0),
      tier1Count: (invS?.tier1_count as number) ?? 0,
      tier2Count: (invS?.tier2_count as number) ?? 0,
      tier3Count: (invS?.tier3_count as number) ?? 0,
      byStore: inventoryByStoreResult.map((r) => ({
        storeSlug: r.store_slug as string,
        productCount: r.product_count as number,
        inventoryValue: Number(r.inventory_value),
        potentialCommission: Number(r.potential_commission),
      })),
    };

    return NextResponse.json({
      kpis,
      topProductsByClicks: topClicksResult,
      topProductsByViews: topViewsResult,
      topStores: topStoresResult,
      signupsByDay: signupsByDayResult,
      referralLeaderboard: referralResult.map((r) => ({
        name: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || r.email,
        email: r.email,
        code: r.code,
        referralCount: r.referralCount,
      })),
      recentActivity: recentActivityResult,
      recentConversions: recentConversionsResult.map((r) => ({
        conversionId: r.conversion_id as string,
        timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp as string,
        orderId: r.order_id as string,
        orderTotal: r.order_total as number,
        storeSlug: r.store_slug as string,
        storeName: r.store_name as string,
        matched: r.matched as boolean,
        viaClickId: r.via_click_id as string | null,
        clickedProduct: (r.matched_click_data as { productName?: string } | null)?.productName ?? null,
      })),
      inventory,
    });
  } catch (err) {
    console.error("[analytics-deep] error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
