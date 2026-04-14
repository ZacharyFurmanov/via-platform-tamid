import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sendPriceDropEmails } from "@/app/lib/email";

export const maxDuration = 60;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return url;
}

function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminToken = request.cookies.get("via_admin_token")?.value;
  if (!adminToken) return false;
  // Accept hashed token
  let hash = 0;
  for (let i = 0; i < adminPassword.length; i++) {
    const char = adminPassword.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return adminToken === hash.toString(36);
}

/**
 * POST /api/admin/send-price-drop-test
 *
 * Body: { testEmail: "you@example.com", storeSlug?: "rareality-archive", limit?: 5 }
 *
 * Fetches real products from the store that have compare_at_price > price (already discounted),
 * or falls back to any products with a simulated 15% "old price". Sends to testEmail only.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const testEmail: string | undefined = body?.testEmail;
  const storeSlug: string = body?.storeSlug ?? "rareality-archive";
  const limit: number = Math.min(body?.limit ?? 5, 10);

  if (!testEmail) {
    return NextResponse.json({ error: "Provide { testEmail }" }, { status: 400 });
  }

  const sql = neon(getDatabaseUrl());

  // Prefer products that already have compare_at_price > price (real markdowns)
  let rows = await sql`
    SELECT id, title, price, compare_at_price, image, store_name, store_slug
    FROM products
    WHERE store_slug = ${storeSlug}
      AND compare_at_price IS NOT NULL
      AND compare_at_price > price
      AND image IS NOT NULL
    ORDER BY (compare_at_price - price) DESC
    LIMIT ${limit}
  `;

  // Fall back to any products from the store (simulate a 15% drop)
  if (rows.length === 0) {
    rows = await sql`
      SELECT id, title, price, image, store_name, store_slug
      FROM products
      WHERE store_slug = ${storeSlug}
        AND image IS NOT NULL
      ORDER BY price DESC
      LIMIT ${limit}
    `;
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: `No products found for store: ${storeSlug}` }, { status: 404 });
  }

  const notifications = rows.map((row) => ({
    user_id: "test-user",
    email: testEmail,
    product_id: row.id as number,
    product_title: row.title as string,
    product_image: row.image as string | null,
    store_name: row.store_name as string,
    store_slug: row.store_slug as string,
    old_price: row.compare_at_price != null
      ? Number(row.compare_at_price)
      : Math.round(Number(row.price) * 1.15),
    new_price: Number(row.price),
  }));

  const { sent, failed } = await sendPriceDropEmails(notifications);

  return NextResponse.json({
    success: true,
    test: true,
    testEmail,
    storeSlug,
    products: rows.length,
    sent,
    failed,
    preview: notifications.map((n) => ({
      title: n.product_title,
      oldPrice: `$${n.old_price}`,
      newPrice: `$${n.new_price}`,
    })),
  });
}
