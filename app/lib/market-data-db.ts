import { neon } from "@neondatabase/serverless";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return url;
}

export type MarketSummary = {
  totalSold: number;
  totalGmv: number;
  avgDaysToSell: number | null;
  avgPriceRealization: number | null; // final / original price ratio
  periodDays: number;
};

export type DesignerStat = {
  designer: string;
  itemsSold: number;
  avgPrice: number;
  avgDaysToSell: number | null;
  totalGmv: number;
  minPrice: number;
  maxPrice: number;
};

export type PriceTierStat = {
  tier: string;
  count: number;
  avgDaysToSell: number | null;
  totalGmv: number;
  avgPrice: number;
};

export type StoreVelocityStat = {
  storeSlug: string;
  storeName: string;
  itemsSold: number;
  avgDaysToSell: number | null;
  totalGmv: number;
};

export type WeeklyTrendPoint = {
  week: string;
  itemsSold: number;
  gmv: number;
};

export type RecentSale = {
  id: number;
  storeSlug: string;
  storeName: string;
  title: string;
  designer: string | null;
  finalPrice: number;
  originalPrice: number | null;
  currency: string;
  image: string | null;
  size: string | null;
  clickCount: number;
  favoriteCount: number;
  daysListed: number | null;
  soldAt: string;
};

export type PriceChangeEntry = {
  id: number;
  storeSlug: string;
  title: string;
  designer: string | null;
  oldPrice: number;
  newPrice: number;
  priceDelta: number;
  currency: string;
  changedAt: string;
};

export async function getMarketSummary(days = 30): Promise<MarketSummary> {
  const sql = neon(getDatabaseUrl());
  const [row] = await sql`
    SELECT
      COUNT(*)::int                                                         AS total_sold,
      COALESCE(SUM(final_price), 0)                                         AS total_gmv,
      AVG(days_listed)                                                      AS avg_days,
      AVG(CASE WHEN original_price > 0 THEN final_price / original_price END) AS avg_realization
    FROM sold_items
    WHERE sold_at >= NOW() - (${days} || ' days')::interval
  `;
  return {
    totalSold: Number(row.total_sold),
    totalGmv: Number(row.total_gmv),
    avgDaysToSell: row.avg_days != null ? Math.round(Number(row.avg_days) * 10) / 10 : null,
    avgPriceRealization: row.avg_realization != null ? Math.round(Number(row.avg_realization) * 1000) / 1000 : null,
    periodDays: days,
  };
}

export async function getTopDesigners(days = 90, limit = 25): Promise<DesignerStat[]> {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    SELECT
      designer,
      COUNT(*)::int           AS items_sold,
      AVG(final_price)        AS avg_price,
      AVG(days_listed)        AS avg_days,
      SUM(final_price)        AS total_gmv,
      MIN(final_price)        AS min_price,
      MAX(final_price)        AS max_price
    FROM sold_items
    WHERE designer IS NOT NULL
      AND designer != ''
      AND sold_at >= NOW() - (${days} || ' days')::interval
    GROUP BY designer
    ORDER BY items_sold DESC, total_gmv DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    designer: r.designer as string,
    itemsSold: Number(r.items_sold),
    avgPrice: Math.round(Number(r.avg_price) * 100) / 100,
    avgDaysToSell: r.avg_days != null ? Math.round(Number(r.avg_days) * 10) / 10 : null,
    totalGmv: Math.round(Number(r.total_gmv) * 100) / 100,
    minPrice: Number(r.min_price),
    maxPrice: Number(r.max_price),
  }));
}

export async function getPriceTierBreakdown(days = 90): Promise<PriceTierStat[]> {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    SELECT
      CASE
        WHEN final_price < 100   THEN 'Under $100'
        WHEN final_price < 500   THEN '$100–$500'
        WHEN final_price < 1000  THEN '$500–$1,000'
        WHEN final_price < 5000  THEN '$1,000–$5,000'
        ELSE '$5,000+'
      END                    AS tier,
      CASE
        WHEN final_price < 100   THEN 1
        WHEN final_price < 500   THEN 2
        WHEN final_price < 1000  THEN 3
        WHEN final_price < 5000  THEN 4
        ELSE 5
      END                    AS sort_order,
      COUNT(*)::int          AS count,
      AVG(days_listed)       AS avg_days,
      SUM(final_price)       AS total_gmv,
      AVG(final_price)       AS avg_price
    FROM sold_items
    WHERE sold_at >= NOW() - (${days} || ' days')::interval
    GROUP BY tier, sort_order
    ORDER BY sort_order
  `;
  return rows.map((r) => ({
    tier: r.tier as string,
    count: Number(r.count),
    avgDaysToSell: r.avg_days != null ? Math.round(Number(r.avg_days) * 10) / 10 : null,
    totalGmv: Math.round(Number(r.total_gmv) * 100) / 100,
    avgPrice: Math.round(Number(r.avg_price) * 100) / 100,
  }));
}

export async function getStoreVelocity(days = 90): Promise<StoreVelocityStat[]> {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    SELECT
      store_slug,
      store_name,
      COUNT(*)::int    AS items_sold,
      AVG(days_listed) AS avg_days,
      SUM(final_price) AS total_gmv
    FROM sold_items
    WHERE sold_at >= NOW() - (${days} || ' days')::interval
    GROUP BY store_slug, store_name
    ORDER BY items_sold DESC
  `;
  return rows.map((r) => ({
    storeSlug: r.store_slug as string,
    storeName: r.store_name as string,
    itemsSold: Number(r.items_sold),
    avgDaysToSell: r.avg_days != null ? Math.round(Number(r.avg_days) * 10) / 10 : null,
    totalGmv: Math.round(Number(r.total_gmv) * 100) / 100,
  }));
}

export async function getWeeklyTrend(weeks = 12): Promise<WeeklyTrendPoint[]> {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    SELECT
      DATE_TRUNC('week', sold_at)::date::text AS week,
      COUNT(*)::int                           AS items_sold,
      SUM(final_price)                        AS gmv
    FROM sold_items
    WHERE sold_at >= NOW() - (${weeks * 7} || ' days')::interval
    GROUP BY DATE_TRUNC('week', sold_at)
    ORDER BY DATE_TRUNC('week', sold_at) ASC
  `;
  return rows.map((r) => ({
    week: r.week as string,
    itemsSold: Number(r.items_sold),
    gmv: Math.round(Number(r.gmv) * 100) / 100,
  }));
}

export async function getRecentSales(limit = 50): Promise<RecentSale[]> {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    SELECT * FROM sold_items
    ORDER BY sold_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: r.id as number,
    storeSlug: r.store_slug as string,
    storeName: r.store_name as string,
    title: r.title as string,
    designer: r.designer as string | null,
    finalPrice: Number(r.final_price),
    originalPrice: r.original_price != null ? Number(r.original_price) : null,
    currency: r.currency as string,
    image: r.image as string | null,
    size: r.size as string | null,
    clickCount: Number(r.click_count),
    favoriteCount: Number(r.favorite_count),
    daysListed: r.days_listed != null ? Number(r.days_listed) : null,
    soldAt: r.sold_at as string,
  }));
}

export async function getRecentPriceChanges(limit = 50, dropsOnly = true): Promise<PriceChangeEntry[]> {
  const sql = neon(getDatabaseUrl());
  const rows = dropsOnly
    ? await sql`
        SELECT *, (new_price - old_price) AS price_delta
        FROM price_history
        WHERE new_price < old_price
        ORDER BY changed_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT *, (new_price - old_price) AS price_delta
        FROM price_history
        ORDER BY changed_at DESC
        LIMIT ${limit}
      `;
  return rows.map((r) => ({
    id: r.id as number,
    storeSlug: r.store_slug as string,
    title: r.title as string,
    designer: r.designer as string | null,
    oldPrice: Number(r.old_price),
    newPrice: Number(r.new_price),
    priceDelta: Number(r.price_delta),
    currency: r.currency as string,
    changedAt: r.changed_at as string,
  }));
}

export async function getTotalSoldItems(): Promise<number> {
  const sql = neon(getDatabaseUrl());
  const [row] = await sql`SELECT COUNT(*)::int AS cnt FROM sold_items`;
  return Number(row.cnt);
}
