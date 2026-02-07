import { neon } from "@neondatabase/serverless";

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
};

export async function saveClick(click: ClickRecord): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await initAnalyticsTables();

  await sql`
    INSERT INTO clicks (click_id, timestamp, product_id, product_name, store, store_slug, external_url, user_agent)
    VALUES (${click.clickId}, ${click.timestamp}, ${click.productId}, ${click.productName}, ${click.store}, ${click.storeSlug}, ${click.externalUrl}, ${click.userAgent || null})
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
    INSERT INTO conversions (conversion_id, timestamp, order_id, order_total, currency, items, via_click_id, store_slug, store_name, matched, matched_click_data)
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
      ${conversion.matchedClickData ? JSON.stringify(conversion.matchedClickData) : null}
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
    ? await sql`SELECT * FROM conversions WHERE timestamp >= ${cutoff} ORDER BY timestamp DESC`
    : await sql`SELECT * FROM conversions ORDER BY timestamp DESC`;

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
  };
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
    matchedClickData: row.matched_click_data as ConversionRecord["matchedClickData"],
  };
}
