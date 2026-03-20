import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

function hashPassword(password: string): string {
  const crypto = require("crypto");
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

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return NextResponse.json({ error: "No database" }, { status: 500 });

  const sql = neon(dbUrl);
  const filter = request.nextUrl.searchParams.get("filter") ?? "unmatched";
  const storeSlug = request.nextUrl.searchParams.get("store");

  const rows = filter === "all"
    ? storeSlug
      ? await sql`
          SELECT c.*, u.email AS user_email, u.name AS user_name
          FROM conversions c
          LEFT JOIN users u ON u.id::text = c.user_id
          WHERE c.order_total > 0 AND c.store_slug = ${storeSlug}
          ORDER BY c.timestamp DESC
          LIMIT 200
        `
      : await sql`
          SELECT c.*, u.email AS user_email, u.name AS user_name
          FROM conversions c
          LEFT JOIN users u ON u.id::text = c.user_id
          WHERE c.order_total > 0
          ORDER BY c.timestamp DESC
          LIMIT 200
        `
    : storeSlug
      ? await sql`
          SELECT c.*, u.email AS user_email, u.name AS user_name
          FROM conversions c
          LEFT JOIN users u ON u.id::text = c.user_id
          WHERE c.order_total > 0 AND (c.matched = false OR c.matched IS NULL) AND c.store_slug = ${storeSlug}
          ORDER BY c.timestamp DESC
          LIMIT 200
        `
      : await sql`
          SELECT c.*, u.email AS user_email, u.name AS user_name
          FROM conversions c
          LEFT JOIN users u ON u.id::text = c.user_id
          WHERE c.order_total > 0 AND (c.matched = false OR c.matched IS NULL)
          ORDER BY c.timestamp DESC
          LIMIT 200
        `;

  return NextResponse.json({
    conversions: rows.map((r) => ({
      conversionId: r.conversion_id,
      timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
      orderId: r.order_id,
      orderTotal: Number(r.order_total),
      currency: r.currency,
      storeSlug: r.store_slug,
      storeName: r.store_name,
      matched: r.matched ?? false,
      viaClickId: r.via_click_id ?? null,
      userId: r.user_id ?? null,
      userEmail: r.user_email ?? null,
      userName: r.user_name ?? null,
      matchedClickData: r.matched_click_data ?? null,
      items: r.items ?? [],
    })),
  });
}

// POST /api/admin/conversions — manually create a conversion record
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return NextResponse.json({ error: "No database" }, { status: 500 });

  const { storeSlug, storeName, orderId, orderTotal, currency, userEmail, timestamp } = await request.json();
  if (!storeSlug || !orderId || !orderTotal) {
    return NextResponse.json({ error: "storeSlug, orderId, orderTotal required" }, { status: 400 });
  }

  const sql = neon(dbUrl);

  // Look up user by email if provided
  let userId: string | null = null;
  if (userEmail) {
    const userRows = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${userEmail}) LIMIT 1`;
    userId = userRows[0]?.id ? String(userRows[0].id) : null;
  }

  const conversionId = crypto.randomUUID();
  const ts = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

  await sql`
    INSERT INTO conversions (conversion_id, timestamp, order_id, order_total, currency, store_slug, store_name, matched, user_id, matched_click_data)
    VALUES (
      ${conversionId},
      ${ts}::timestamptz,
      ${orderId},
      ${Number(orderTotal)},
      ${currency || "USD"},
      ${storeSlug},
      ${storeName || storeSlug},
      ${userId ? true : false},
      ${userId},
      ${userId ? JSON.stringify({ source: "admin-manual-user", userId }) : null}
    )
  `;

  return NextResponse.json({ ok: true, conversionId });
}
