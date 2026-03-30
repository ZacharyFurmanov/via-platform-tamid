import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}
function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const token = request.cookies.get("via_admin_token")?.value;
  return token === hashPassword(adminPassword);
}

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return url;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = neon(getDatabaseUrl());

  // Ensure columns exist
  await sql`ALTER TABLE conversions ADD COLUMN IF NOT EXISTS returned BOOLEAN DEFAULT FALSE`.catch(() => {});
  await sql`ALTER TABLE conversions ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ`.catch(() => {});

  const [summary, byStore, recent] = await Promise.all([
    // Summary stats: counts and GMV for all-time, 30d, 7d
    sql`
      SELECT
        COUNT(*) FILTER (WHERE order_total > 0)::int                             AS total_orders,
        COUNT(*) FILTER (WHERE returned = true)::int                             AS total_returns,
        COALESCE(SUM(order_total) FILTER (WHERE order_total > 0
          AND (returned IS NULL OR returned = false)), 0)::numeric               AS total_gmv,
        COALESCE(SUM(order_total) FILTER (WHERE returned = true), 0)::numeric   AS total_returned_value,

        COUNT(*) FILTER (WHERE order_total > 0
          AND timestamp >= NOW() - INTERVAL '30 days')::int                     AS orders_30d,
        COUNT(*) FILTER (WHERE returned = true
          AND returned_at >= NOW() - INTERVAL '30 days')::int                   AS returns_30d,
        COALESCE(SUM(order_total) FILTER (WHERE order_total > 0
          AND (returned IS NULL OR returned = false)
          AND timestamp >= NOW() - INTERVAL '30 days'), 0)::numeric             AS gmv_30d,
        COALESCE(SUM(order_total) FILTER (WHERE returned = true
          AND returned_at >= NOW() - INTERVAL '30 days'), 0)::numeric           AS returned_value_30d,

        COUNT(*) FILTER (WHERE order_total > 0
          AND timestamp >= NOW() - INTERVAL '7 days')::int                      AS orders_7d,
        COUNT(*) FILTER (WHERE returned = true
          AND returned_at >= NOW() - INTERVAL '7 days')::int                    AS returns_7d,
        COALESCE(SUM(order_total) FILTER (WHERE order_total > 0
          AND (returned IS NULL OR returned = false)
          AND timestamp >= NOW() - INTERVAL '7 days'), 0)::numeric              AS gmv_7d,
        COALESCE(SUM(order_total) FILTER (WHERE returned = true
          AND returned_at >= NOW() - INTERVAL '7 days'), 0)::numeric            AS returned_value_7d
      FROM conversions
    `,

    // Return rate + value broken down by store
    sql`
      SELECT
        store_slug,
        store_name,
        COUNT(*) FILTER (WHERE order_total > 0)::int                            AS total_orders,
        COUNT(*) FILTER (WHERE returned = true)::int                            AS return_count,
        COALESCE(SUM(order_total) FILTER (WHERE returned = true), 0)::numeric  AS returned_value,
        COALESCE(SUM(order_total) FILTER (WHERE order_total > 0), 0)::numeric  AS total_value
      FROM conversions
      WHERE store_slug IS NOT NULL
      GROUP BY store_slug, store_name
      HAVING COUNT(*) FILTER (WHERE returned = true) > 0
      ORDER BY return_count DESC
      LIMIT 25
    `,

    // 50 most recent returns with user info
    sql`
      SELECT
        c.conversion_id,
        c.order_id,
        c.order_total,
        c.currency,
        c.store_slug,
        c.store_name,
        c.timestamp,
        c.returned_at,
        c.items,
        u.email  AS user_email,
        u.name   AS user_name
      FROM conversions c
      LEFT JOIN users u ON u.id::text = c.user_id
      WHERE c.returned = true
      ORDER BY c.returned_at DESC NULLS LAST
      LIMIT 50
    `,
  ]);

  const s = summary[0];

  return NextResponse.json({
    summary: {
      allTime: {
        totalOrders: s.total_orders,
        totalReturns: s.total_returns,
        totalGmv: Number(s.total_gmv),
        returnedValue: Number(s.total_returned_value),
        returnRate: s.total_orders > 0 ? (s.total_returns / s.total_orders) * 100 : 0,
      },
      thirtyDay: {
        totalOrders: s.orders_30d,
        totalReturns: s.returns_30d,
        totalGmv: Number(s.gmv_30d),
        returnedValue: Number(s.returned_value_30d),
        returnRate: s.orders_30d > 0 ? (s.returns_30d / s.orders_30d) * 100 : 0,
      },
      sevenDay: {
        totalOrders: s.orders_7d,
        totalReturns: s.returns_7d,
        totalGmv: Number(s.gmv_7d),
        returnedValue: Number(s.returned_value_7d),
        returnRate: s.orders_7d > 0 ? (s.returns_7d / s.orders_7d) * 100 : 0,
      },
    },
    byStore: byStore.map((r) => ({
      storeSlug: r.store_slug,
      storeName: r.store_name,
      totalOrders: r.total_orders,
      returnCount: r.return_count,
      returnedValue: Number(r.returned_value),
      totalValue: Number(r.total_value),
      returnRate: r.total_orders > 0 ? (r.return_count / r.total_orders) * 100 : 0,
    })),
    recent: recent.map((r) => ({
      conversionId: r.conversion_id,
      orderId: r.order_id,
      orderTotal: Number(r.order_total),
      currency: r.currency,
      storeSlug: r.store_slug,
      storeName: r.store_name,
      timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
      returnedAt: r.returned_at instanceof Date ? r.returned_at.toISOString() : (r.returned_at ?? null),
      items: r.items ?? [],
      userEmail: r.user_email ?? null,
      userName: r.user_name ?? null,
    })),
  });
}
