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
    GROUP BY pf.user_id, u.email, p.id, p.title, p.image, p.store_name, p.store_slug
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
