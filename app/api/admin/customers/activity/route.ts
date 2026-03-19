import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

function isAdminAuthenticated(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminToken = request.cookies.get("via_admin_token")?.value;
  return !!adminToken && adminToken === crypto.createHash("sha256").update(adminPassword).digest("hex");
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = request.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return NextResponse.json({ error: "No DB" }, { status: 500 });
  const sql = neon(url);

  // Get user id from users table
  const userRows = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1`;
  const userId = userRows[0]?.id as string | null;

  const [favorites, cart, clicks, orders] = await Promise.all([
    userId ? sql`
      SELECT
        pf.product_id,
        pf.created_at,
        (pf.product_snapshot->>'title') AS title,
        (pf.product_snapshot->>'image') AS image,
        (pf.product_snapshot->>'store_name') AS store_name,
        (pf.product_snapshot->>'price') AS price
      FROM product_favorites pf
      WHERE pf.user_id = ${userId}
      ORDER BY pf.created_at DESC
      LIMIT 50
    ` : Promise.resolve([]),

    userId ? sql`
      SELECT product_id, product_title, product_image, store_name, price, currency, added_at
      FROM user_cart_items
      WHERE user_id = ${userId}
      ORDER BY added_at DESC
      LIMIT 50
    ` : Promise.resolve([]),

    userId ? sql`
      SELECT product_name, store, timestamp
      FROM clicks
      WHERE user_id = ${userId}
      ORDER BY timestamp DESC
      LIMIT 50
    ` : Promise.resolve([]),

    userId ? sql`
      SELECT order_id, order_total, store_name, timestamp, matched_click_data
      FROM conversions
      WHERE user_id = ${userId} AND order_total > 0
      ORDER BY timestamp DESC
      LIMIT 20
    ` : Promise.resolve([]),
  ]);

  return NextResponse.json(
    { userId, favorites, cart, clicks, orders },
    { headers: { "Cache-Control": "no-store" } }
  );
}
