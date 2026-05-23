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
 topCategoriesRows,
 topProductsRows,
 newUsersRows,
 activeUsersRows,
 clickTotalsRows,
 dayOfWeekRows,
 ] = await Promise.all([
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

 // Total clicks this month vs prior
 sql`
 SELECT
 COUNT(*) FILTER (WHERE timestamp >= ${monthStart} AND timestamp < ${monthEnd})::int AS clicks_cur,
 COUNT(*) FILTER (WHERE timestamp >= ${prevMonthStart} AND timestamp < ${monthStart})::int AS clicks_prev
 FROM clicks
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
 ]);

 const newUsers = newUsersRows[0];
 const activeUsers = activeUsersRows[0];
 const clickTotals = clickTotalsRows[0];

 const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
 const maxDowClicks = Math.max(...dayOfWeekRows.map((r) => r.clicks as number), 1);

 await sendMonthlyReportEmail({
 monthLabel,
 newUsersCur: newUsers.new_cur as number,
 newUsersPrev: newUsers.new_prev as number,
 activeUsersCur: activeUsers.active_cur as number,
 activeUsersPrev: activeUsers.active_prev as number,
 clicksCur: clickTotals.clicks_cur as number,
 clicksPrev: clickTotals.clicks_prev as number,
 topCategories: topCategoriesRows as { category: string; clicks: number }[],
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
