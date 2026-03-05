import { neon } from "@neondatabase/serverless";
import { getProductFavoriteCounts } from "./favorites-db";

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set.");
  }
  return url;
};

export async function initAnalyticsTables() {
  const sql = neon(getDatabaseUrl());

  await sql`
    CREATE TABLE IF NOT EXISTS product_views (
      id SERIAL PRIMARY KEY,
      product_id VARCHAR(255) NOT NULL,
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_product_views_timestamp ON product_views(timestamp)`;

  await sql`
    CREATE TABLE IF NOT EXISTS clicks (
      id SERIAL PRIMARY KEY,
      click_id VARCHAR(32) NOT NULL UNIQUE,
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      product_id VARCHAR(255) NOT NULL DEFAULT 'unknown',
      product_name TEXT NOT NULL DEFAULT 'unknown',
      store VARCHAR(255) NOT NULL DEFAULT 'unknown',
      store_slug VARCHAR(255) NOT NULL DEFAULT 'unknown',
      external_url TEXT NOT NULL,
      user_agent TEXT
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON clicks(timestamp)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_clicks_store ON clicks(store)`;

  await sql`
    CREATE TABLE IF NOT EXISTS conversions (
      id SERIAL PRIMARY KEY,
      conversion_id VARCHAR(64) NOT NULL UNIQUE,
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      order_id VARCHAR(255) NOT NULL,
      order_total NUMERIC(10,2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      items JSONB DEFAULT '[]',
      via_click_id VARCHAR(32),
      store_slug VARCHAR(255) NOT NULL,
      store_name VARCHAR(255) NOT NULL,
      matched BOOLEAN DEFAULT FALSE,
      matched_click_data JSONB
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_conversions_timestamp ON conversions(timestamp)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_conversions_store ON conversions(store_slug)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_conversions_order_store ON conversions(order_id, store_slug)`;

  // Migrations: add user_id to clicks and conversions (safe to run repeatedly)
  await sql`ALTER TABLE clicks ADD COLUMN IF NOT EXISTS user_id TEXT`;
  await sql`ALTER TABLE conversions ADD COLUMN IF NOT EXISTS user_id TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS idx_clicks_user_id ON clicks(user_id) WHERE user_id IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_conversions_user_id ON conversions(user_id) WHERE user_id IS NOT NULL`;
}

export type ClickRecord = {
  clickId: string;
  timestamp: string;
  productId: string;
  productName: string;
  store: string;
  storeSlug: string;
  externalUrl: string;
  userAgent?: string;
  userId?: string | null;
};

export async function saveClick(click: ClickRecord): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await initAnalyticsTables();

  await sql`
    INSERT INTO clicks (click_id, timestamp, product_id, product_name, store, store_slug, external_url, user_agent, user_id)
    VALUES (${click.clickId}, ${click.timestamp}, ${click.productId}, ${click.productName}, ${click.store}, ${click.storeSlug}, ${click.externalUrl}, ${click.userAgent || null}, ${click.userId || null})
    ON CONFLICT (click_id) DO NOTHING
  `;
}

export async function getClickByClickId(clickId: string): Promise<ClickRecord | null> {
  const sql = neon(getDatabaseUrl());
  await initAnalyticsTables();

  const rows = await sql`
    SELECT * FROM clicks WHERE click_id = ${clickId} LIMIT 1
  `;

  if (rows.length === 0) return null;
  return mapClickRow(rows[0]);
}

export async function getClickAnalytics(range: string) {
  const sql = neon(getDatabaseUrl());
  await initAnalyticsTables();

  let cutoff: string | null = null;
  if (range === "7d") {
    cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (range === "30d") {
    cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Total clicks
  const countResult = cutoff
    ? await sql`SELECT COUNT(*)::int AS total FROM clicks WHERE timestamp >= ${cutoff}`
    : await sql`SELECT COUNT(*)::int AS total FROM clicks`;
  const totalClicks = countResult[0].total as number;

  // Clicks by store
  const storeRows = cutoff
    ? await sql`SELECT store, COUNT(*)::int AS count FROM clicks WHERE timestamp >= ${cutoff} GROUP BY store ORDER BY count DESC`
    : await sql`SELECT store, COUNT(*)::int AS count FROM clicks GROUP BY store ORDER BY count DESC`;
  const clicksByStore: Record<string, number> = {};
  for (const row of storeRows) {
    clicksByStore[row.store as string] = row.count as number;
  }

  // Top 10 products
  const productRows = cutoff
    ? await sql`SELECT product_id, product_name, store, COUNT(*)::int AS count FROM clicks WHERE timestamp >= ${cutoff} GROUP BY product_id, product_name, store ORDER BY count DESC LIMIT 10`
    : await sql`SELECT product_id, product_name, store, COUNT(*)::int AS count FROM clicks GROUP BY product_id, product_name, store ORDER BY count DESC LIMIT 10`;
  const topProducts = productRows.map((row) => ({
    id: row.product_id as string,
    name: row.product_name as string,
    store: row.store as string,
    count: row.count as number,
  }));

  // Recent 50 clicks
  const recentRows = cutoff
    ? await sql`SELECT * FROM clicks WHERE timestamp >= ${cutoff} ORDER BY timestamp DESC LIMIT 50`
    : await sql`SELECT * FROM clicks ORDER BY timestamp DESC LIMIT 50`;
  const recentClicks = recentRows.map(mapClickRow);

  return { totalClicks, clicksByStore, topProducts, recentClicks, range };
}

export type ConversionRecord = {
  conversionId: string;
  timestamp: string;
  orderId: string;
  orderTotal: number;
  currency: string;
  items: ConversionItem[];
  viaClickId: string | null;
  storeSlug: string;
  storeName: string;
  matched: boolean;
  userId?: string | null;
  matchedClickData?: {
    clickId: string;
    clickTimestamp: string;
    productName: string;
  };
};

type ConversionItem = {
  productId?: string;
  productName: string;
  quantity: number;
  price: number;
};

export async function saveConversion(conversion: ConversionRecord): Promise<{ duplicate: boolean }> {
  const sql = neon(getDatabaseUrl());
  await initAnalyticsTables();

  // Check for duplicate
  const existing = await sql`
    SELECT id FROM conversions WHERE order_id = ${conversion.orderId} AND store_slug = ${conversion.storeSlug} LIMIT 1
  `;
  if (existing.length > 0) {
    return { duplicate: true };
  }

  await sql`
    INSERT INTO conversions (conversion_id, timestamp, order_id, order_total, currency, items, via_click_id, store_slug, store_name, matched, matched_click_data, user_id)
    VALUES (
      ${conversion.conversionId},
      ${conversion.timestamp},
      ${conversion.orderId},
      ${conversion.orderTotal},
      ${conversion.currency},
      ${JSON.stringify(conversion.items)},
      ${conversion.viaClickId},
      ${conversion.storeSlug},
      ${conversion.storeName},
      ${conversion.matched},
      ${conversion.matchedClickData ? JSON.stringify(conversion.matchedClickData) : null},
      ${conversion.userId || null}
    )
  `;

  return { duplicate: false };
}

export async function getConversionAnalytics(range: string) {
  const sql = neon(getDatabaseUrl());
  await initAnalyticsTables();

  let cutoff: string | null = null;
  if (range === "7d") {
    cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (range === "30d") {
    cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  const rows = cutoff
    ? await sql`SELECT * FROM conversions WHERE order_total > 0 AND timestamp >= ${cutoff} ORDER BY timestamp DESC`
    : await sql`SELECT * FROM conversions WHERE order_total > 0 ORDER BY timestamp DESC`;

  const conversions = rows.map(mapConversionRow);

  const totalConversions = conversions.length;
  const matchedConversions = conversions.filter((c) => c.matched).length;
  const totalRevenue = conversions.reduce((sum, c) => sum + c.orderTotal, 0);
  const matchedRevenue = conversions
    .filter((c) => c.matched)
    .reduce((sum, c) => sum + c.orderTotal, 0);

  const revenueByStore: Record<string, { total: number; matched: number; count: number }> = {};
  for (const conv of conversions) {
    if (!revenueByStore[conv.storeName]) {
      revenueByStore[conv.storeName] = { total: 0, matched: 0, count: 0 };
    }
    revenueByStore[conv.storeName].total += conv.orderTotal;
    revenueByStore[conv.storeName].count++;
    if (conv.matched) {
      revenueByStore[conv.storeName].matched += conv.orderTotal;
    }
  }

  const recentConversions = conversions.slice(0, 20);

  return {
    totalConversions,
    matchedConversions,
    totalRevenue,
    matchedRevenue,
    revenueByStore,
    recentConversions,
    range,
  };
}

/**
 * Record a product page view. Called fire-and-forget from the product page.
 */
export async function saveProductView(productId: string): Promise<void> {
  const sql = neon(getDatabaseUrl());
  // CREATE IF NOT EXISTS is idempotent — safe to call each time
  await sql`
    CREATE TABLE IF NOT EXISTS product_views (
      id SERIAL PRIMARY KEY,
      product_id VARCHAR(255) NOT NULL,
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id)`;
  await sql`INSERT INTO product_views (product_id) VALUES (${productId})`;
}

/**
 * Compute popularity scores for a set of products.
 * Returns a map of dbId -> score.
 */
export async function getProductPopularityScores(
  dbIds: number[]
): Promise<Record<number, number>> {
  if (dbIds.length === 0) return {};

  const sql = neon(getDatabaseUrl());

  // Look up composite IDs (store_slug-id) for these DB IDs
  const productRows = await sql`
    SELECT id, store_slug FROM products WHERE id = ANY(${dbIds})
  `;
  const compositeIdMap = new Map<string, number>(); // compositeId -> dbId
  for (const row of productRows) {
    const compositeId = `${row.store_slug}-${row.id}`;
    compositeIdMap.set(compositeId, row.id as number);
  }

  const compositeIds = Array.from(compositeIdMap.keys());
  if (compositeIds.length === 0) return {};

  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [clickRows, favCounts, conversionRows, viewRows] = await Promise.all([
    // Clicks with recency weighting (strong signal: user went to buy)
    sql`
      SELECT product_id,
        SUM(CASE WHEN timestamp >= ${sevenDaysAgo}::timestamptz THEN 3
                 WHEN timestamp >= ${thirtyDaysAgo}::timestamptz THEN 2
                 ELSE 1 END)::int AS score
      FROM clicks
      WHERE product_id = ANY(${compositeIds})
      GROUP BY product_id
    `,
    // Favorites
    getProductFavoriteCounts(dbIds),
    // Conversions
    sql`
      SELECT item->>'productId' AS product_id, COUNT(*)::int AS count
      FROM conversions, jsonb_array_elements(items) AS item
      WHERE timestamp >= ${ninetyDaysAgo}::timestamptz
        AND item->>'productId' = ANY(${compositeIds})
      GROUP BY item->>'productId'
    `,
    // Page views with recency weighting (softer signal: user was interested)
    sql`
      SELECT product_id,
        SUM(CASE WHEN timestamp >= ${sevenDaysAgo}::timestamptz THEN 2
                 WHEN timestamp >= ${thirtyDaysAgo}::timestamptz THEN 1
                 ELSE 0 END)::int AS score
      FROM product_views
      WHERE product_id = ANY(${compositeIds})
      GROUP BY product_id
    `.catch(() => [] as { product_id: string; score: number }[]),
  ]);

  const scores: Record<number, number> = {};

  // Click scores (high intent: user went to buy)
  for (const row of clickRows) {
    const dbId = compositeIdMap.get(row.product_id as string);
    if (dbId != null) {
      scores[dbId] = (scores[dbId] ?? 0) + (row.score as number);
    }
  }

  // Favorite scores (3 pts each)
  for (const [dbId, count] of Object.entries(favCounts)) {
    const id = Number(dbId);
    scores[id] = (scores[id] ?? 0) + count * 3;
  }

  // Conversion scores (5 pts each)
  for (const row of conversionRows) {
    const dbId = compositeIdMap.get(row.product_id as string);
    if (dbId != null) {
      scores[dbId] = (scores[dbId] ?? 0) + (row.count as number) * 5;
    }
  }

  // Page view scores (lower weight than clicks — interest signal only)
  for (const row of viewRows) {
    const dbId = compositeIdMap.get((row as { product_id: string; score: number }).product_id);
    if (dbId != null) {
      scores[dbId] = (scores[dbId] ?? 0) + ((row as { product_id: string; score: number }).score ?? 0);
    }
  }

  return scores;
}

export async function getStoreAnalytics(storeSlug: string, range: string) {
  const sql = neon(getDatabaseUrl());
  await initAnalyticsTables();

  let cutoff: string | null = null;
  if (range === "7d") {
    cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (range === "30d") {
    cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  const [clickCountRows, topProductRows, recentClickRows, conversionRows] = await Promise.all([
    cutoff
      ? sql`SELECT COUNT(*)::int AS total FROM clicks WHERE store_slug = ${storeSlug} AND timestamp >= ${cutoff}`
      : sql`SELECT COUNT(*)::int AS total FROM clicks WHERE store_slug = ${storeSlug}`,
    cutoff
      ? sql`SELECT product_name, COUNT(*)::int AS count FROM clicks WHERE store_slug = ${storeSlug} AND timestamp >= ${cutoff} GROUP BY product_name ORDER BY count DESC LIMIT 10`
      : sql`SELECT product_name, COUNT(*)::int AS count FROM clicks WHERE store_slug = ${storeSlug} GROUP BY product_name ORDER BY count DESC LIMIT 10`,
    cutoff
      ? sql`SELECT * FROM clicks WHERE store_slug = ${storeSlug} AND timestamp >= ${cutoff} ORDER BY timestamp DESC LIMIT 20`
      : sql`SELECT * FROM clicks WHERE store_slug = ${storeSlug} ORDER BY timestamp DESC LIMIT 20`,
    cutoff
      ? sql`SELECT * FROM conversions WHERE store_slug = ${storeSlug} AND order_total > 0 AND timestamp >= ${cutoff} ORDER BY timestamp DESC`
      : sql`SELECT * FROM conversions WHERE store_slug = ${storeSlug} AND order_total > 0 ORDER BY timestamp DESC`,
  ]);

  const totalClicks = clickCountRows[0].total as number;
  const topProducts = topProductRows.map((row) => ({
    name: row.product_name as string,
    count: row.count as number,
  }));
  const recentClicks = recentClickRows.map(mapClickRow);
  const conversions = conversionRows.map(mapConversionRow);
  const totalConversions = conversions.length;
  const totalRevenue = conversions.reduce((sum, c) => sum + c.orderTotal, 0);
  const recentConversions = conversions.slice(0, 20);

  return {
    totalClicks,
    totalConversions,
    totalRevenue,
    topProducts,
    recentClicks,
    recentConversions,
    range,
  };
}

function mapClickRow(row: Record<string, unknown>): ClickRecord {
  return {
    clickId: row.click_id as string,
    timestamp: (row.timestamp as Date)?.toISOString?.() || (row.timestamp as string),
    productId: row.product_id as string,
    productName: row.product_name as string,
    store: row.store as string,
    storeSlug: row.store_slug as string,
    externalUrl: row.external_url as string,
    userAgent: row.user_agent as string | undefined,
    userId: row.user_id as string | null | undefined,
  };
}

/**
 * Get a user's full click history (products they browsed and clicked through to buy).
 */
export async function getUserClickHistory(userId: string): Promise<ClickRecord[]> {
  const sql = neon(getDatabaseUrl());
  await initAnalyticsTables();
  const rows = await sql`
    SELECT * FROM clicks
    WHERE user_id = ${userId}
    ORDER BY timestamp DESC
    LIMIT 100
  `;
  return rows.map(mapClickRow);
}

/**
 * Get confirmed purchases (conversions) attributed to a user.
 */
export async function getUserPurchaseHistory(userId: string): Promise<ConversionRecord[]> {
  const sql = neon(getDatabaseUrl());
  await initAnalyticsTables();
  const rows = await sql`
    SELECT * FROM conversions
    WHERE user_id = ${userId}
    ORDER BY timestamp DESC
  `;
  return rows.map(mapConversionRow);
}

export type CustomerSummary = {
  userId: string;
  email: string | null;
  name: string | null;
  clickCount: number;
  purchaseCount: number;
  totalSpend: number;
  lastSeen: string;
  firstSeen: string;
};

/**
 * Admin: all users who have at least one tracked click, with purchase stats.
 * Joins clicks/conversions against the users table.
 */
export async function getCustomerSummaries(): Promise<CustomerSummary[]> {
  const sql = neon(getDatabaseUrl());
  await initAnalyticsTables();

  const rows = await sql`
    SELECT
      u.id AS user_id,
      u.email,
      u.name,
      COUNT(DISTINCT c.click_id)::int AS click_count,
      COUNT(DISTINCT cv.conversion_id)::int AS purchase_count,
      COALESCE(SUM(cv.order_total), 0)::numeric AS total_spend,
      MAX(GREATEST(c.timestamp, COALESCE(cv.timestamp, c.timestamp)))::text AS last_seen,
      MIN(c.timestamp)::text AS first_seen
    FROM users u
    LEFT JOIN clicks c ON c.user_id = u.id
    LEFT JOIN conversions cv ON cv.user_id = u.id
    WHERE c.user_id IS NOT NULL
    GROUP BY u.id, u.email, u.name
    ORDER BY purchase_count DESC, click_count DESC
  `;

  return rows.map((row) => ({
    userId: row.user_id as string,
    email: row.email as string | null,
    name: row.name as string | null,
    clickCount: row.click_count as number,
    purchaseCount: row.purchase_count as number,
    totalSpend: Number(row.total_spend),
    lastSeen: row.last_seen as string,
    firstSeen: row.first_seen as string,
  }));
}

function mapConversionRow(row: Record<string, unknown>): ConversionRecord {
  return {
    conversionId: row.conversion_id as string,
    timestamp: (row.timestamp as Date)?.toISOString?.() || (row.timestamp as string),
    orderId: row.order_id as string,
    orderTotal: Number(row.order_total),
    currency: row.currency as string,
    items: (row.items || []) as ConversionItem[],
    viaClickId: row.via_click_id as string | null,
    storeSlug: row.store_slug as string,
    storeName: row.store_name as string,
    matched: row.matched as boolean,
    userId: row.user_id as string | null | undefined,
    matchedClickData: row.matched_click_data as ConversionRecord["matchedClickData"],
  };
}
