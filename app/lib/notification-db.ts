import { neon } from "@neondatabase/serverless";

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set.");
  }
  return url;
};

let tablesInitialized = false;

export async function initNotificationTables() {
  if (tablesInitialized) return;
  const sql = neon(getDatabaseUrl());

  await sql`
    CREATE TABLE IF NOT EXISTS favorite_notifications (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      product_id INT NOT NULL,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      click_count_at_send INT NOT NULL DEFAULT 0
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_fav_notif_user_product ON favorite_notifications(user_id, product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_fav_notif_sent_at ON favorite_notifications(sent_at)`;

  tablesInitialized = true;
}

export type NotificationCandidate = {
  user_id: string;
  email: string;
  product_id: number;
  product_title: string;
  product_image: string | null;
  store_name: string;
  store_slug: string;
  price: number;
  currency: string;
  recent_click_count: number;
};

/**
 * Find products that have favorites AND recent clicks since last notification.
 * A product qualifies if it has 3+ clicks since the user was last notified
 * (or since they favorited it, if never notified).
 */
export async function getFavoriteNotificationCandidates(): Promise<NotificationCandidate[]> {
  await initNotificationTables();
  const sql = neon(getDatabaseUrl());

  // The clicks table stores product_id as composite string "store-slug-123"
  // We need to join with products by extracting the numeric ID
  const rows = await sql`
    SELECT
      pf.user_id,
      u.email,
      p.id AS product_id,
      p.title AS product_title,
      p.image AS product_image,
      p.store_name,
      p.store_slug,
      p.price,
      p.currency,
      COUNT(c.id) AS recent_click_count
    FROM product_favorites pf
    JOIN users u ON u.id = pf.user_id
    JOIN products p ON p.id = pf.product_id
    JOIN clicks c ON c.product_id = CONCAT(p.store_slug, '-', p.id::text)
      AND c.timestamp > COALESCE(
        (SELECT MAX(fn.sent_at) FROM favorite_notifications fn
         WHERE fn.user_id = pf.user_id AND fn.product_id = pf.product_id),
        pf.created_at
      )
    WHERE u.notification_emails_enabled = TRUE
    GROUP BY pf.user_id, u.email, p.id, p.title, p.image, p.store_name, p.store_slug, p.price, p.currency
    HAVING COUNT(c.id) >= 3
  `;

  return rows as NotificationCandidate[];
}

/**
 * Record that a notification was sent to a user for a product.
 */
export async function recordNotificationSent(
  userId: string,
  productId: number,
  clickCount: number
): Promise<void> {
  await initNotificationTables();
  const sql = neon(getDatabaseUrl());

  await sql`
    INSERT INTO favorite_notifications (user_id, product_id, click_count_at_send)
    VALUES (${userId}, ${productId}, ${clickCount})
  `;
}

export type TrendingCandidate = {
  user_id: string;
  email: string;
  product_id: number;
  product_title: string;
  product_image: string | null;
  store_name: string;
  store_slug: string;
  price: number;
  currency: string;
  favorite_count: number;
};

/**
 * Find products with 15+ favorites where the user hasn't received a trending email yet.
 */
export async function getTrendingCandidates(): Promise<TrendingCandidate[]> {
  await initNotificationTables();
  const sql = neon(getDatabaseUrl());

  await sql`
    CREATE TABLE IF NOT EXISTS trending_notifications (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      product_id INT NOT NULL,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    )
  `;

  const rows = await sql`
    SELECT
      pf.user_id,
      u.email,
      p.id AS product_id,
      p.title AS product_title,
      p.image AS product_image,
      p.store_name,
      p.store_slug,
      p.price,
      p.currency,
      counts.favorite_count
    FROM product_favorites pf
    JOIN users u ON u.id = pf.user_id
    JOIN products p ON p.id = pf.product_id
    JOIN (
      SELECT product_id, COUNT(*) AS favorite_count
      FROM product_favorites
      GROUP BY product_id
      HAVING COUNT(*) >= 15
    ) counts ON counts.product_id = pf.product_id
    WHERE u.notification_emails_enabled = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM trending_notifications tn
        WHERE tn.user_id = pf.user_id AND tn.product_id = pf.product_id
      )
  `;

  return rows as TrendingCandidate[];
}

export async function recordTrendingNotificationSent(userId: string, productId: number): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await sql`
    INSERT INTO trending_notifications (user_id, product_id)
    VALUES (${userId}, ${productId})
    ON CONFLICT (user_id, product_id) DO NOTHING
  `;
}

/**
 * Get how many notification emails a user has received today (for daily cap).
 */
export async function getNotificationsSentTodayCount(userId: string): Promise<number> {
  await initNotificationTables();
  const sql = neon(getDatabaseUrl());

  const rows = await sql`
    SELECT COUNT(*) as count FROM favorite_notifications
    WHERE user_id = ${userId}
      AND sent_at >= CURRENT_DATE
  `;

  return Number(rows[0]?.count ?? 0);
}

// ---------------------------------------------------------------------------
// Price Drop Notifications
// ---------------------------------------------------------------------------

export type PriceDropNotificationCandidate = {
  user_id: string;
  email: string;
  product_id: number;
  product_title: string;
  product_image: string | null;
  store_name: string;
  store_slug: string;
  old_price: number;
  new_price: number;
};

/**
 * Initialise the price_drop_notifications table (idempotent).
 */
async function ensurePriceDropTable() {
  const sql = neon(getDatabaseUrl());
  await sql`
    CREATE TABLE IF NOT EXISTS price_drop_notifications (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      product_id INT NOT NULL,
      new_price NUMERIC(10,2) NOT NULL,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (user_id, product_id, new_price)
    )
  `;
}

/**
 * For each price-dropped product, find users who favorited OR viewed it and
 * haven't already received a notification at this exact new price.
 * Respects notification_emails_enabled on the users table.
 */
export async function getPriceDropCandidates(
  priceDrops: Array<{ productId: number; oldPrice: number; newPrice: number; title: string; image: string | null; storeSlug: string; storeName: string }>
): Promise<PriceDropNotificationCandidate[]> {
  if (priceDrops.length === 0) return [];
  await ensurePriceDropTable();
  const sql = neon(getDatabaseUrl());

  const results: PriceDropNotificationCandidate[] = [];

  for (const drop of priceDrops) {
    // Users who favorited OR viewed (deduplicated) and haven't been notified at this price
    const rows = await sql`
      SELECT DISTINCT u.id AS user_id, u.email
      FROM users u
      WHERE u.notification_emails_enabled = TRUE
        AND (
          EXISTS (
            SELECT 1 FROM product_favorites pf
            WHERE pf.user_id = u.id AND pf.product_id = ${drop.productId}
          )
          OR EXISTS (
            SELECT 1 FROM product_views pv
            WHERE pv.user_id = u.id::text AND pv.product_id = ${`${drop.storeSlug}-${drop.productId}`}
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM price_drop_notifications pdn
          WHERE pdn.user_id = u.id AND pdn.product_id = ${drop.productId} AND pdn.new_price = ${drop.newPrice}
        )
    `;

    for (const row of rows) {
      results.push({
        user_id: row.user_id as string,
        email: row.email as string,
        product_id: drop.productId,
        product_title: drop.title,
        product_image: drop.image,
        store_name: drop.storeName,
        store_slug: drop.storeSlug,
        old_price: drop.oldPrice,
        new_price: drop.newPrice,
      });
    }
  }

  return results;
}

/**
 * Mark price drop notifications as sent so we don't resend them.
 */
export async function recordPriceDropNotificationsSent(
  candidates: Array<{ user_id: string; product_id: number; new_price: number }>
): Promise<void> {
  if (candidates.length === 0) return;
  await ensurePriceDropTable();
  const sql = neon(getDatabaseUrl());
  for (const c of candidates) {
    await sql`
      INSERT INTO price_drop_notifications (user_id, product_id, new_price)
      VALUES (${c.user_id}, ${c.product_id}, ${c.new_price})
      ON CONFLICT (user_id, product_id, new_price) DO NOTHING
    `;
  }
}
