import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sendMonthlyReportEmail } from "@/app/lib/email";

export const maxDuration = 120;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return NextResponse.json({ error: "No database" }, { status: 500 });

  const sql = neon(dbUrl);

  try {

  // Report covers the previous full calendar month
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));

  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  const [
    gmvRows,
    topStoresRows,
    topCategoriesRows,
    priceRangeRows,
    topProductsRows,
    newUsersRows,
    activeUsersRows,
    convRateRows,
    dayOfWeekRows,
    returningBuyersRows,
  ] = await Promise.all([
    // GMV: this month vs prior month
    sql`
      SELECT
        COALESCE(SUM(order_total) FILTER (WHERE timestamp >= ${monthStart} AND timestamp < ${monthEnd}), 0)::float AS gmv_cur,
        COUNT(*) FILTER (WHERE timestamp >= ${monthStart} AND timestamp < ${monthEnd})::int AS orders_cur,
        COALESCE(SUM(order_total) FILTER (WHERE timestamp >= ${prevMonthStart} AND timestamp < ${monthStart}), 0)::float AS gmv_prev,
        COUNT(*) FILTER (WHERE timestamp >= ${prevMonthStart} AND timestamp < ${monthStart})::int AS orders_prev
      FROM conversions
      WHERE order_total > 0 AND (returned IS NULL OR returned = false)
    `,

    // Top stores by GMV this month
    sql`
      SELECT store_name, store_slug,
        SUM(order_total)::float AS gmv,
        COUNT(*)::int AS orders
      FROM conversions
      WHERE order_total > 0
        AND (returned IS NULL OR returned = false)
        AND timestamp >= ${monthStart} AND timestamp < ${monthEnd}
      GROUP BY store_name, store_slug
      ORDER BY gmv DESC
      LIMIT 10
    `,

    // Top categories by clicks this month (join clicks → products for product_type)
    sql`
      SELECT
        COALESCE(NULLIF(p.product_type, ''), 'Other') AS category,
        COUNT(*)::int AS clicks
      FROM clicks cl
      LEFT JOIN products p ON (p.store_slug || '-' || p.id::text) = cl.product_id
      WHERE cl.timestamp >= ${monthStart} AND cl.timestamp < ${monthEnd}
        AND COALESCE(NULLIF(p.product_type, ''), 'Other') != 'Other'
      GROUP BY COALESCE(NULLIF(p.product_type, ''), 'Other')
      ORDER BY clicks DESC
      LIMIT 8
    `,

    // Price range distribution of orders this month
    sql`
      SELECT
        CASE
          WHEN order_total < 50  THEN 'Under $50'
          WHEN order_total < 100 THEN '$50–$99'
          WHEN order_total < 200 THEN '$100–$199'
          WHEN order_total < 500 THEN '$200–$499'
          ELSE '$500+'
        END AS range,
        COUNT(*)::int AS orders,
        COALESCE(SUM(order_total), 0)::float AS gmv
      FROM conversions
      WHERE order_total > 0
        AND (returned IS NULL OR returned = false)
        AND timestamp >= ${monthStart} AND timestamp < ${monthEnd}
      GROUP BY range
      ORDER BY MIN(order_total)
    `,

    // Top clicked products this month (most-wanted signal)
    sql`
      SELECT product_name, store_slug,
        COUNT(*)::int AS clicks,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int AS unique_users
      FROM clicks
      WHERE timestamp >= ${monthStart} AND timestamp < ${monthEnd}
        AND product_name IS NOT NULL AND product_name != ''
      GROUP BY product_name, store_slug
      ORDER BY clicks DESC
      LIMIT 15
    `,

    // New users this month vs prior
    sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= ${monthStart} AND created_at < ${monthEnd})::int AS new_cur,
        COUNT(*) FILTER (WHERE created_at >= ${prevMonthStart} AND created_at < ${monthStart})::int AS new_prev
      FROM users
    `,

    // Active users (clicked at least once) this month vs prior
    sql`
      SELECT
        COUNT(DISTINCT user_id) FILTER (WHERE timestamp >= ${monthStart} AND timestamp < ${monthEnd} AND user_id IS NOT NULL)::int AS active_cur,
        COUNT(DISTINCT user_id) FILTER (WHERE timestamp >= ${prevMonthStart} AND timestamp < ${monthStart} AND user_id IS NOT NULL)::int AS active_prev
      FROM clicks
    `,

    // Conversion rate: orders / clicks this month vs prior
    sql`
      SELECT
        COUNT(DISTINCT cl.click_id) FILTER (WHERE cl.timestamp >= ${monthStart} AND cl.timestamp < ${monthEnd})::int AS clicks_cur,
        COUNT(DISTINCT cl.click_id) FILTER (WHERE cl.timestamp >= ${prevMonthStart} AND cl.timestamp < ${monthStart})::int AS clicks_prev
      FROM clicks cl
    `,

    // Day-of-week click distribution (UTC)
    sql`
      SELECT
        EXTRACT(DOW FROM timestamp)::int AS dow,
        COUNT(*)::int AS clicks
      FROM clicks
      WHERE timestamp >= ${monthStart} AND timestamp < ${monthEnd}
      GROUP BY dow
      ORDER BY dow
    `,

    // Repeat buyers: bought more than once ever, and bought this month
    sql`
      SELECT COUNT(DISTINCT user_id)::int AS repeat_buyers
      FROM conversions
      WHERE order_total > 0
        AND (returned IS NULL OR returned = false)
        AND timestamp >= ${monthStart} AND timestamp < ${monthEnd}
        AND user_id IN (
          SELECT user_id FROM conversions
          WHERE order_total > 0
            AND (returned IS NULL OR returned = false)
            AND timestamp < ${monthStart}
            AND user_id IS NOT NULL
          GROUP BY user_id
        )
    `,
  ]);

  const gmv = gmvRows[0];
  const newUsers = newUsersRows[0];
  const activeUsers = activeUsersRows[0];
  const clickTotals = convRateRows[0];
  const repeatBuyers = returningBuyersRows[0]?.repeat_buyers ?? 0;

  const convRate = clickTotals.clicks_cur > 0 ? (gmv.orders_cur / clickTotals.clicks_cur) * 100 : 0;
  const convRatePrev = clickTotals.clicks_prev > 0 ? (gmv.orders_prev / clickTotals.clicks_prev) * 100 : 0;

  const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const maxDowClicks = Math.max(...dayOfWeekRows.map((r) => r.clicks as number), 1);

  await sendMonthlyReportEmail({
    monthLabel,
    gmvCur: gmv.gmv_cur as number,
    gmvPrev: gmv.gmv_prev as number,
    ordersCur: gmv.orders_cur as number,
    ordersPrev: gmv.orders_prev as number,
    newUsersCur: newUsers.new_cur as number,
    newUsersPrev: newUsers.new_prev as number,
    activeUsersCur: activeUsers.active_cur as number,
    activeUsersPrev: activeUsers.active_prev as number,
    clicksCur: clickTotals.clicks_cur as number,
    clicksPrev: clickTotals.clicks_prev as number,
    convRate,
    convRatePrev,
    repeatBuyers,
    topStores: topStoresRows as { store_name: string; store_slug: string; gmv: number; orders: number }[],
    topCategories: topCategoriesRows as { category: string; clicks: number }[],
    priceRanges: priceRangeRows as { range: string; orders: number; gmv: number }[],
    topProducts: topProductsRows as { product_name: string; store_slug: string; clicks: number; unique_users: number }[],
    dayOfWeek: dayOfWeekRows.map((r) => ({
      label: DOW_LABELS[r.dow as number] ?? String(r.dow),
      clicks: r.clicks as number,
      pct: Math.round(((r.clicks as number) / maxDowClicks) * 100),
    })),
  });

  console.log(`[Monthly Report] Sent ${monthLabel} report`);
  return NextResponse.json({ ok: true, month: monthLabel });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Monthly Report] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
