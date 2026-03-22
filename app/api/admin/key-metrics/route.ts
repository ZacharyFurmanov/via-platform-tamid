import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}
function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const token = request.cookies.get("via_admin_token")?.value;
  return token === hashPassword(adminPassword);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return NextResponse.json({ error: "No database" }, { status: 500 });

  const sql = neon(dbUrl);

  const [
    gmvRows,
    clickRows,
    conversionRows,
    insiderRows,
    wauMauRows,
    saverRows,
    saverBuyerRows,
    revenuePerUserRows,
    gmvByWeekRows,
    registeredUsersRows,
    waitlistRows,
    activityBreakdownRows,
  ] = await Promise.all([
    // GMV — total, this 7d, prev 7d, this 30d, prev 30d
    sql`
      SELECT
        COALESCE(SUM(order_total), 0)::float                                                                   AS total_gmv,
        COALESCE(SUM(order_total) FILTER (WHERE timestamp >= NOW() - INTERVAL '7 days'), 0)::float             AS gmv_7d,
        COALESCE(SUM(order_total) FILTER (WHERE timestamp >= NOW() - INTERVAL '14 days'
                                              AND timestamp <  NOW() - INTERVAL '7 days'), 0)::float           AS gmv_prev_7d,
        COALESCE(SUM(order_total) FILTER (WHERE timestamp >= NOW() - INTERVAL '30 days'), 0)::float            AS gmv_30d,
        COALESCE(SUM(order_total) FILTER (WHERE timestamp >= NOW() - INTERVAL '60 days'
                                              AND timestamp <  NOW() - INTERVAL '30 days'), 0)::float          AS gmv_prev_30d
      FROM conversions WHERE order_total > 0
    `,

    // Clicks — all time, 7d, 30d
    sql`
      SELECT
        COUNT(*)::int                                                                         AS total_clicks,
        COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '7 days')::int                  AS clicks_7d,
        COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '14 days'
                             AND timestamp <  NOW() - INTERVAL '7 days')::int                AS clicks_prev_7d,
        COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '30 days')::int                 AS clicks_30d,
        COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '60 days'
                             AND timestamp <  NOW() - INTERVAL '30 days')::int               AS clicks_prev_30d
      FROM clicks
    `,

    // Conversions (matched = purchases we can attribute)
    sql`
      SELECT
        COUNT(*)::int                                                                         AS total_conversions,
        COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '7 days')::int                  AS conversions_7d,
        COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '14 days'
                             AND timestamp <  NOW() - INTERVAL '7 days')::int                AS conversions_prev_7d,
        COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '30 days')::int                 AS conversions_30d,
        COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '60 days'
                             AND timestamp <  NOW() - INTERVAL '30 days')::int               AS conversions_prev_30d
      FROM conversions WHERE order_total > 0
    `,

    // Insider conversion — approved pilot users vs actual members
    sql`
      SELECT
        COUNT(*) FILTER (WHERE pa.status = 'approved')::int           AS approved_pilots,
        COUNT(u.id) FILTER (WHERE u.is_member = true)::int            AS insider_members
      FROM pilot_access pa
      LEFT JOIN users u ON LOWER(u.email) = LOWER(pa.email)
    `,

    // WAU / MAU — distinct users active across clicks, favorites, conversions, or new signups
    sql`
      SELECT
        COUNT(DISTINCT user_id)::int                                                                                    AS total_ever_active,
        COUNT(DISTINCT user_id) FILTER (WHERE ts >= NOW() - INTERVAL '7 days')::int                                    AS wau,
        COUNT(DISTINCT user_id) FILTER (WHERE ts >= NOW() - INTERVAL '14 days' AND ts < NOW() - INTERVAL '7 days')::int AS wau_prev,
        COUNT(DISTINCT user_id) FILTER (WHERE ts >= NOW() - INTERVAL '30 days')::int                                   AS mau,
        COUNT(DISTINCT user_id) FILTER (WHERE ts >= NOW() - INTERVAL '60 days' AND ts < NOW() - INTERVAL '30 days')::int AS mau_prev
      FROM (
        SELECT user_id::text,  timestamp  AS ts FROM clicks            WHERE user_id IS NOT NULL
        UNION ALL
        SELECT user_id::text,  created_at AS ts FROM product_favorites WHERE user_id IS NOT NULL
        UNION ALL
        SELECT user_id::text,  created_at AS ts FROM store_favorites   WHERE user_id IS NOT NULL
        UNION ALL
        SELECT user_id::text,  timestamp  AS ts FROM conversions       WHERE user_id IS NOT NULL
        UNION ALL
        SELECT id::text,       created_at AS ts FROM users             WHERE id IS NOT NULL
      ) activity
    `,

    // Save-to-purchase: total unique users who have saved anything (products OR stores)
    sql`
      SELECT COUNT(DISTINCT user_id::text)::int AS total_savers FROM (
        SELECT user_id FROM product_favorites WHERE user_id IS NOT NULL
        UNION
        SELECT user_id FROM store_favorites WHERE user_id IS NOT NULL
      ) all_savers
    `,

    // Save-to-purchase: savers who also have a conversion
    sql`
      SELECT COUNT(DISTINCT c.user_id)::int AS savers_who_bought
      FROM conversions c
      WHERE c.user_id IS NOT NULL
        AND c.order_total > 0
        AND EXISTS (
          SELECT 1 FROM product_favorites pf
          WHERE pf.user_id::text = c.user_id
        )
    `,

    // Revenue per buying user — total GMV ÷ total distinct buyers
    // Matched orders: count distinct user_ids. Unmatched: each counts as +1 unknown buyer.
    sql`
      SELECT
        COALESCE(SUM(order_total), 0)::float                                                    AS total_gmv,
        (COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)
         + COUNT(*) FILTER (WHERE user_id IS NULL))::int                                        AS buying_users
      FROM conversions
      WHERE order_total > 0
    `,

    // GMV by week — last 10 weeks for sparkline
    sql`
      SELECT
        DATE_TRUNC('week', timestamp)::date::text  AS week,
        COALESCE(SUM(order_total), 0)::float       AS gmv
      FROM conversions
      WHERE order_total > 0 AND timestamp >= NOW() - INTERVAL '10 weeks'
      GROUP BY 1
      ORDER BY 1 ASC
    `,

    // Total registered users
    sql`SELECT COUNT(*)::int AS total FROM users`,

    // Total waitlist signups (pilot_access)
    sql`SELECT COUNT(*)::int AS total FROM pilot_access`,

    // Raw distinct user counts per activity table
    sql`
      SELECT
        (SELECT COUNT(*)::int FROM users)                                                                   AS registered,
        (SELECT COUNT(DISTINCT user_id)::int FROM clicks WHERE user_id IS NOT NULL)                        AS clickers,
        (SELECT COUNT(DISTINCT user_id::text)::int FROM product_favorites WHERE user_id IS NOT NULL)       AS product_savers,
        (SELECT COUNT(DISTINCT user_id::text)::int FROM store_favorites WHERE user_id IS NOT NULL)         AS store_savers,
        (SELECT COUNT(DISTINCT user_id)::int FROM conversions WHERE user_id IS NOT NULL)                   AS buyers
    `,
  ]);

  const g = gmvRows[0];
  const cl = clickRows[0];
  const co = conversionRows[0];
  const ins = insiderRows[0];
  const wm = wauMauRows[0];
  const rev = revenuePerUserRows[0];

  const totalRegisteredUsers = registeredUsersRows[0]?.total ?? 0;
  const totalWaitlist = waitlistRows[0]?.total ?? 0;
  const ab = activityBreakdownRows?.[0];
  const activityBreakdown = ab ? {
    clickers: (ab.clickers as number) ?? 0,
    productSavers: (ab.product_savers as number) ?? 0,
    storeSavers: (ab.store_savers as number) ?? 0,
    buyers: (ab.buyers as number) ?? 0,
  } : undefined;
  const totalSavers = saverRows[0]?.total_savers ?? 0;
  const saversBought = saverBuyerRows[0]?.savers_who_bought ?? 0;

  // Conversion rate = total conversions / total clicks (all time)
  const convRate = cl.total_clicks > 0 ? co.total_conversions / cl.total_clicks : 0;
  const convRate7d = cl.clicks_7d > 0 ? co.conversions_7d / cl.clicks_7d : 0;
  const convRatePrev7d = cl.clicks_prev_7d > 0 ? co.conversions_prev_7d / cl.clicks_prev_7d : 0;

  // Stickiness = WAU / MAU
  const stickiness = wm.mau > 0 ? wm.wau / wm.mau : 0;
  const stickinessPrev = wm.mau_prev > 0 ? wm.wau_prev / wm.mau_prev : 0;

  // Insider conversion rate
  const insiderRate = ins.approved_pilots > 0 ? ins.insider_members / ins.approved_pilots : 0;

  return NextResponse.json({
    gmv: {
      total: g.total_gmv,
      last7d: g.gmv_7d,
      prev7d: g.gmv_prev_7d,
      last30d: g.gmv_30d,
      prev30d: g.gmv_prev_30d,
    },
    conversionRate: {
      allTime: convRate,
      last7d: convRate7d,
      prev7d: convRatePrev7d,
      totalClicks: cl.total_clicks,
      totalConversions: co.total_conversions,
    },
    insiderConversion: {
      rate: insiderRate,
      approvedPilots: ins.approved_pilots,
      insiderMembers: ins.insider_members,
    },
    wau: {
      current: wm.wau,
      prev: wm.wau_prev,
    },
    mau: {
      current: wm.mau,
      prev: wm.mau_prev,
      totalEverActive: wm.total_ever_active,
    },
    stickiness: {
      current: stickiness,
      prev: stickinessPrev,
    },
    saveToPurchase: {
      rate: totalSavers > 0 ? saversBought / totalSavers : 0,
      totalSavers,
      saversBought,
    },
    revenuePerUser: {
      value: rev.buying_users > 0 ? (rev.total_gmv as number) / (rev.buying_users as number) : 0,
      buyingUsers: rev.buying_users,
    },
    gmvByWeek: gmvByWeekRows,
    users: {
      registered: totalRegisteredUsers,
      waitlist: totalWaitlist,
    },
    activityBreakdown,
  });
}
