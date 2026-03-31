import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";
import { stores as storeList } from "@/app/lib/stores";

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

  const [clicks, views, favorites, cart, orders, storeFavs, retention] = await Promise.all([
    userId ? sql`
      SELECT click_id, product_name, store, store_slug, timestamp
      FROM clicks
      WHERE user_id = ${userId}
      ORDER BY timestamp DESC
      LIMIT 500
    ` : Promise.resolve([] as Row[]),

    userId ? sql`
      SELECT pv.product_id, pv.timestamp,
             p.title AS product_name, p.store_name AS store, p.store_slug
      FROM product_views pv
      LEFT JOIN products p ON (p.store_slug || '-' || p.id::text) = pv.product_id
      WHERE pv.user_id = ${userId}
      ORDER BY pv.timestamp DESC
      LIMIT 1000
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
      SELECT store_slug, created_at
      FROM store_favorites
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    ` : Promise.resolve([] as Row[]),

    userId ? sql`
      SELECT
        MIN(ts)                           AS first_seen,
        MAX(ts)                           AS last_seen,
        COUNT(DISTINCT ts::date)::int     AS distinct_days
      FROM (
        SELECT timestamp AS ts FROM clicks            WHERE user_id = ${userId}
        UNION ALL
        SELECT timestamp                FROM product_views     WHERE user_id = ${userId}
        UNION ALL
        SELECT created_at               FROM product_favorites WHERE user_id = ${userId}
        UNION ALL
        SELECT created_at               FROM store_favorites   WHERE user_id = ${userId}
        UNION ALL
        SELECT timestamp                FROM conversions       WHERE user_id = ${userId} AND order_total > 0
      ) a
    ` : Promise.resolve([{ first_seen: null, last_seen: null, distinct_days: 0 }] as Row[]),
  ]);

  // Build sessions from ALL activity: store clicks + favorites + cart adds
  const SESSION_GAP_MS = 30 * 60 * 1000;

  type ActivityEvent = {
    ts: number;
    type: "click" | "view" | "favorite" | "cart";
    label: string;
    store: string;
    storeSlug: string;
  };

  const allEvents: ActivityEvent[] = [
    ...clicks.map((c) => ({
      ts: new Date(c.timestamp as string).getTime(),
      type: "click" as const,
      label: c.product_name as string,
      store: c.store as string,
      storeSlug: c.store_slug as string,
    })),
    ...views.map((v) => ({
      ts: new Date(v.timestamp as string).getTime(),
      type: "view" as const,
      label: (v.product_name as string | null) ?? "Unknown product",
      store: (v.store as string | null) ?? "",
      storeSlug: (v.store_slug as string | null) ?? "",
    })),
    ...favorites.map((f) => ({
      ts: new Date(f.created_at as string).getTime(),
      type: "favorite" as const,
      label: (f.title as string | null) ?? "Unknown item",
      store: (f.store_name as string | null) ?? "",
      storeSlug: "",
    })),
    ...cart.map((c) => ({
      ts: new Date(c.added_at as string).getTime(),
      type: "cart" as const,
      label: c.product_title as string,
      store: c.store_name as string,
      storeSlug: "",
    })),
  ].sort((a, b) => a.ts - b.ts);

  const sessions: {
    start: string;
    end: string;
    durationMs: number;
    clickCount: number;
    viewCount: number;
    favoriteCount: number;
    cartCount: number;
    clicks: { label: string; store: string; storeSlug: string; timestamp: string; type: string }[];
  }[] = [];

  let currentBatch: ActivityEvent[] = [];
  for (const event of allEvents) {
    if (currentBatch.length === 0) {
      currentBatch.push(event);
    } else {
      const lastTs = currentBatch[currentBatch.length - 1].ts;
      if (event.ts - lastTs > SESSION_GAP_MS) {
        const start = new Date(currentBatch[0].ts).toISOString();
        const end = new Date(currentBatch[currentBatch.length - 1].ts).toISOString();
        sessions.push({
          start, end,
          durationMs: currentBatch[currentBatch.length - 1].ts - currentBatch[0].ts,
          clickCount: currentBatch.filter((e) => e.type === "click").length,
          viewCount: currentBatch.filter((e) => e.type === "view").length,
          favoriteCount: currentBatch.filter((e) => e.type === "favorite").length,
          cartCount: currentBatch.filter((e) => e.type === "cart").length,
          clicks: currentBatch.map((e) => ({ label: e.label, store: e.store, storeSlug: e.storeSlug, timestamp: new Date(e.ts).toISOString(), type: e.type })),
        });
        currentBatch = [event];
      } else {
        currentBatch.push(event);
      }
    }
  }
  if (currentBatch.length > 0) {
    const start = new Date(currentBatch[0].ts).toISOString();
    const end = new Date(currentBatch[currentBatch.length - 1].ts).toISOString();
    sessions.push({
      start, end,
      durationMs: currentBatch[currentBatch.length - 1].ts - currentBatch[0].ts,
      clickCount: currentBatch.filter((e) => e.type === "click").length,
      favoriteCount: currentBatch.filter((e) => e.type === "favorite").length,
      cartCount: currentBatch.filter((e) => e.type === "cart").length,
      clicks: currentBatch.map((e) => ({ label: e.label, store: e.store, storeSlug: e.storeSlug, timestamp: new Date(e.ts).toISOString(), type: e.type })),
    });
  }

  // Most viewed stores from clicks
  const storeCounts: Record<string, { store: string; storeSlug: string; count: number }> = {};
  for (const c of clicks) {
    const slug = (c.store_slug ?? c.store) as string;
    if (!storeCounts[slug]) storeCounts[slug] = { store: c.store as string, storeSlug: c.store_slug as string, count: 0 };
    storeCounts[slug].count++;
  }
  const topStores = Object.values(storeCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  const ret = retention[0] ?? {};
  const firstSeen = ret.first_seen ? (ret.first_seen instanceof Date ? ret.first_seen.toISOString() : String(ret.first_seen)) : null;
  const lastSeen = ret.last_seen ? (ret.last_seen instanceof Date ? ret.last_seen.toISOString() : String(ret.last_seen)) : null;
  const distinctDays = Number(ret.distinct_days ?? 0);
  const daysSinceLastSeen = lastSeen ? Math.floor((Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24)) : null;

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
      totalViews: views.length,
      totalClicks: clicks.length,
      totalFavorites: favorites.length,
      totalCartItems: cart.length,
      totalOrders: orders.length,
      totalGmv,
      totalSessions: sessions.length,
      totalBrowseMs: sessions.reduce((sum, s) => sum + s.durationMs, 0),
    },
    retention: {
      firstSeen,
      lastSeen,
      distinctDays,
      daysSinceLastSeen,
      isReturning: distinctDays >= 2,
    },
    sessions: sessions.reverse().map((s) => ({
      start: s.start,
      end: s.end,
      durationMs: s.durationMs,
      clickCount: s.clickCount,
      viewCount: s.viewCount,
      favoriteCount: s.favoriteCount,
      cartCount: s.cartCount,
      events: s.clicks.map((c) => ({
        type: c.type,
        label: c.label,
        store: c.store,
        storeSlug: c.storeSlug,
        timestamp: c.timestamp,
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
    storeFavorites: storeFavs.map((s) => {
      const storeSlug = s.store_slug as string;
      const storeName = storeList.find((st) => st.slug === storeSlug)?.name ?? storeSlug;
      return {
        storeSlug,
        storeName,
        createdAt: s.created_at instanceof Date ? s.created_at.toISOString() : s.created_at as string,
      };
    }),
  }, { headers: { "Cache-Control": "no-store" } });
}
