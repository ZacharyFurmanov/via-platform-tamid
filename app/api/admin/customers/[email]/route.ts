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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email: encodedEmail } = await params;
  const email = decodeURIComponent(encodedEmail);

  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return NextResponse.json({ error: "No DB" }, { status: 500 });
  const sql = neon(url);

  const [pilotRows, userRows] = await Promise.all([
    sql`SELECT * FROM pilot_access WHERE LOWER(email) = LOWER(${email}) LIMIT 1`,
    sql`SELECT id, name, email, created_at FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1`,
  ]);

  const pilot = pilotRows[0] ?? null;
  const user = userRows[0] ?? null;
  const userId = user?.id ? String(user.id) : null;

  type Row = Record<string, unknown>;

  const [clicks, favorites, cart, orders, storeFavs] = await Promise.all([
    userId ? sql`
      SELECT click_id, product_name, store, store_slug, timestamp
      FROM clicks
      WHERE user_id = ${userId}
      ORDER BY timestamp DESC
      LIMIT 500
    ` : Promise.resolve([] as Row[]),

    userId ? sql`
      SELECT
        pf.product_id,
        pf.created_at,
        (pf.product_snapshot->>'title')      AS title,
        (pf.product_snapshot->>'image')      AS image,
        (pf.product_snapshot->>'store_name') AS store_name,
        (pf.product_snapshot->>'price')      AS price,
        (pf.product_snapshot->>'url')        AS url
      FROM product_favorites pf
      WHERE pf.user_id = ${userId}
      ORDER BY pf.created_at DESC
      LIMIT 200
    ` : Promise.resolve([] as Row[]),

    userId ? sql`
      SELECT product_id, product_title, product_image, store_name, price, currency, added_at
      FROM user_cart_items
      WHERE user_id = ${userId}
      ORDER BY added_at DESC
      LIMIT 50
    ` : Promise.resolve([] as Row[]),

    userId ? sql`
      SELECT conversion_id, order_id, order_total, currency, store_name, store_slug,
             timestamp, matched_click_data, returned, returned_at
      FROM conversions
      WHERE user_id = ${userId} AND order_total > 0
      ORDER BY timestamp DESC
      LIMIT 50
    ` : Promise.resolve([] as Row[]),

    userId ? sql`
      SELECT sf.store_slug, sf.created_at, s.name AS store_name
      FROM store_favorites sf
      LEFT JOIN stores s ON s.slug = sf.store_slug
      WHERE sf.user_id = ${userId}
      ORDER BY sf.created_at DESC
    ` : Promise.resolve([] as Row[]),
  ]);

  // Group clicks into sessions (gap > 30 min = new session)
  const SESSION_GAP_MS = 30 * 60 * 1000;
  const clicksSorted = [...clicks].sort(
    (a, b) => new Date(a.timestamp as string).getTime() - new Date(b.timestamp as string).getTime()
  );

  const sessions: {
    start: string;
    end: string;
    durationMs: number;
    clicks: typeof clicks;
  }[] = [];

  let currentSession: typeof clicks = [];
  for (const click of clicksSorted) {
    if (currentSession.length === 0) {
      currentSession.push(click);
    } else {
      const lastTs = new Date(currentSession[currentSession.length - 1].timestamp as string).getTime();
      const thisTs = new Date(click.timestamp as string).getTime();
      if (thisTs - lastTs > SESSION_GAP_MS) {
        const start = currentSession[0].timestamp as string;
        const end = currentSession[currentSession.length - 1].timestamp as string;
        sessions.push({ start, end, durationMs: new Date(end).getTime() - new Date(start).getTime(), clicks: currentSession });
        currentSession = [click];
      } else {
        currentSession.push(click);
      }
    }
  }
  if (currentSession.length > 0) {
    const start = currentSession[0].timestamp as string;
    const end = currentSession[currentSession.length - 1].timestamp as string;
    sessions.push({ start, end, durationMs: new Date(end).getTime() - new Date(start).getTime(), clicks: currentSession });
  }

  // Most viewed stores from clicks
  const storeCounts: Record<string, { store: string; storeSlug: string; count: number }> = {};
  for (const c of clicks) {
    const slug = (c.store_slug ?? c.store) as string;
    if (!storeCounts[slug]) storeCounts[slug] = { store: c.store as string, storeSlug: c.store_slug as string, count: 0 };
    storeCounts[slug].count++;
  }
  const topStores = Object.values(storeCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  const totalGmv = (orders as { order_total: number; returned?: boolean }[])
    .filter((o) => !o.returned)
    .reduce((sum, o) => sum + Number(o.order_total), 0);

  return NextResponse.json({
    profile: {
      email,
      name: user?.name ?? pilot?.first_name ? `${pilot?.first_name ?? ""} ${pilot?.last_name ?? ""}`.trim() : null,
      phone: pilot?.phone ?? null,
      status: pilot?.status ?? null,
      signedUpAt: pilot?.created_at ?? null,
      approvedAt: pilot?.approved_at ?? null,
      referralCode: pilot?.referral_code ?? null,
      referredBy: pilot?.referred_by ?? null,
      promoCode: pilot?.promo_code ?? null,
      emailSubscribe: pilot?.email_subscribe ?? false,
      smsSubscribe: pilot?.sms_subscribe ?? false,
      hasAccount: !!userId,
    },
    stats: {
      totalClicks: clicks.length,
      totalFavorites: favorites.length,
      totalCartItems: cart.length,
      totalOrders: orders.length,
      totalGmv,
      totalSessions: sessions.length,
      totalBrowseMs: sessions.reduce((sum, s) => sum + s.durationMs, 0),
    },
    sessions: sessions.reverse().map((s) => ({
      start: s.start,
      end: s.end,
      durationMs: s.durationMs,
      clickCount: s.clicks.length,
      clicks: s.clicks.map((c) => ({
        clickId: c.click_id,
        productName: c.product_name,
        store: c.store,
        storeSlug: c.store_slug,
        timestamp: c.timestamp instanceof Date ? c.timestamp.toISOString() : c.timestamp,
      })),
    })),
    topStores,
    favorites: favorites.map((f) => ({
      productId: f.product_id,
      title: f.title,
      image: f.image,
      storeName: f.store_name,
      price: f.price,
      url: f.url,
      createdAt: f.created_at instanceof Date ? f.created_at.toISOString() : f.created_at,
    })),
    cart: cart.map((c) => ({
      productId: c.product_id,
      title: c.product_title,
      image: c.product_image,
      storeName: c.store_name,
      price: c.price,
      currency: c.currency,
      addedAt: c.added_at instanceof Date ? c.added_at.toISOString() : c.added_at,
    })),
    orders: orders.map((o) => ({
      conversionId: o.conversion_id,
      orderId: o.order_id,
      orderTotal: Number(o.order_total),
      currency: o.currency,
      storeName: o.store_name,
      storeSlug: o.store_slug,
      timestamp: o.timestamp instanceof Date ? o.timestamp.toISOString() : o.timestamp,
      returned: !!o.returned,
      returnedAt: o.returned_at instanceof Date ? o.returned_at.toISOString() : (o.returned_at ?? null),
    })),
    storeFavorites: storeFavs.map((s) => ({
      storeSlug: s.store_slug,
      storeName: s.store_name ?? s.store_slug,
      createdAt: s.created_at instanceof Date ? s.created_at.toISOString() : s.created_at,
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}
