import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sendPriceDropEmails } from "@/app/lib/email";
import { getPriceDropCandidates, recordPriceDropNotificationsSent } from "@/app/lib/notification-db";

export const maxDuration = 120;

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
 * Modes:
 *   { testEmail: "you@example.com", storeSlug?: "rareality-archive" }
 *     → Sends to testEmail only (bypasses viewed/hearted check). Good for previewing the template.
 *
 *   { preview: true, storeSlug?: "rareality-archive" }
 *     → Returns who would receive emails without sending anything.
 *
 *   { send: true, storeSlug?: "rareality-archive" }
 *     → Real send: only goes to users who actually favorited/viewed products from this store
 *       that have compare_at_price > price. Marks as sent so they won't receive duplicates.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const testEmail: string | undefined = body?.testEmail;
  const storeSlug: string = body?.storeSlug ?? "rareality-archive";
  const preview: boolean = body?.preview === true;
  const sendForReal: boolean = body?.send === true;

  if (!testEmail && !preview && !sendForReal) {
    return NextResponse.json(
      { error: "Provide { testEmail }, { preview: true }, or { send: true }" },
      { status: 400 }
    );
  }

  const sql = neon(getDatabaseUrl());

  // Get discounted products for this store (compare_at_price > price)
  const rows = await sql`
    SELECT id, title, price, compare_at_price, image, store_name, store_slug
    FROM products
    WHERE store_slug = ${storeSlug}
      AND compare_at_price IS NOT NULL
      AND compare_at_price > price
      AND image IS NOT NULL
    ORDER BY (compare_at_price - price) DESC
  `;

  if (rows.length === 0) {
    return NextResponse.json({
      success: true,
      message: `No marked-down products found for ${storeSlug}`,
      products: 0,
    });
  }

  const priceDrops = rows.map((row) => ({
    productId: row.id as number,
    title: row.title as string,
    image: row.image as string | null,
    oldPrice: Number(row.compare_at_price),
    newPrice: Number(row.price),
    storeSlug: row.store_slug as string,
    storeName: row.store_name as string,
  }));

  // Test send — goes to testEmail only, not tracked
  if (testEmail) {
    const notifications = priceDrops.map((drop) => ({
      user_id: "test-user",
      email: testEmail,
      product_id: drop.productId,
      product_title: drop.title,
      product_image: drop.image,
      store_name: drop.storeName,
      store_slug: drop.storeSlug,
      old_price: drop.oldPrice,
      new_price: drop.newPrice,
    }));
    const { sent, failed } = await sendPriceDropEmails(notifications);
    return NextResponse.json({
      success: true,
      test: true,
      testEmail,
      storeSlug,
      products: priceDrops.length,
      sent,
      failed,
      preview: priceDrops.map((d) => ({
        title: d.title,
        oldPrice: `$${Math.round(d.oldPrice)}`,
        newPrice: `$${Math.round(d.newPrice)}`,
      })),
    });
  }

  // Find real candidates (users who favorited/viewed, not yet notified)
  const candidates = await getPriceDropCandidates(priceDrops);

  if (preview) {
    const byUser = new Map<string, { email: string; products: string[] }>();
    for (const c of candidates) {
      if (!byUser.has(c.user_id)) byUser.set(c.user_id, { email: c.email, products: [] });
      byUser.get(c.user_id)!.products.push(c.product_title);
    }
    return NextResponse.json({
      preview: true,
      storeSlug,
      markedDownProducts: priceDrops.length,
      eligibleUsers: byUser.size,
      totalEmailItems: candidates.length,
      sample: Array.from(byUser.values()).slice(0, 5),
    });
  }

  // Real send
  if (candidates.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No users to notify (no one has favorited/viewed these products, or all already notified).",
      storeSlug,
      markedDownProducts: priceDrops.length,
      sent: 0,
    });
  }

  const { sent, failed } = await sendPriceDropEmails(candidates);
  await recordPriceDropNotificationsSent(
    candidates.map((c) => ({ user_id: c.user_id, product_id: c.product_id, new_price: c.new_price }))
  );

  return NextResponse.json({
    success: true,
    storeSlug,
    markedDownProducts: priceDrops.length,
    usersNotified: new Set(candidates.map((c) => c.user_id)).size,
    sent,
    failed,
  });
}
