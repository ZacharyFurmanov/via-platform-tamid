import { neon } from "@neondatabase/serverless";
import type { DBProduct } from "./db";

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set.");
  }
  return url;
};

let tablesInitialized = false;

export async function initFavoritesTables() {
  if (tablesInitialized) return;
  const sql = neon(getDatabaseUrl());

  await sql`
    CREATE TABLE IF NOT EXISTS product_favorites (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      product_id INT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_product_favorites_user ON product_favorites(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_product_favorites_product ON product_favorites(product_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS store_favorites (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      store_slug VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, store_slug)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_store_favorites_user ON store_favorites(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_store_favorites_store ON store_favorites(store_slug)`;

  tablesInitialized = true;
}

/**
 * Toggle a product favorite. Returns true if now favorited, false if unfavorited.
 */
export async function toggleProductFavorite(userId: string, productId: number): Promise<boolean> {
  await initFavoritesTables();
  const sql = neon(getDatabaseUrl());

  // Check if already favorited
  const existing = await sql`
    SELECT id FROM product_favorites WHERE user_id = ${userId} AND product_id = ${productId}
  `;

  if (existing.length > 0) {
    await sql`DELETE FROM product_favorites WHERE user_id = ${userId} AND product_id = ${productId}`;
    return false;
  } else {
    await sql`INSERT INTO product_favorites (user_id, product_id) VALUES (${userId}, ${productId})`;
    return true;
  }
}

/**
 * Toggle a store favorite. Returns true if now favorited, false if unfavorited.
 */
export async function toggleStoreFavorite(userId: string, storeSlug: string): Promise<boolean> {
  await initFavoritesTables();
  const sql = neon(getDatabaseUrl());

  const existing = await sql`
    SELECT id FROM store_favorites WHERE user_id = ${userId} AND store_slug = ${storeSlug}
  `;

  if (existing.length > 0) {
    await sql`DELETE FROM store_favorites WHERE user_id = ${userId} AND store_slug = ${storeSlug}`;
    return false;
  } else {
    await sql`INSERT INTO store_favorites (user_id, store_slug) VALUES (${userId}, ${storeSlug})`;
    return true;
  }
}

/**
 * Get all product IDs favorited by a user.
 */
export async function getUserProductFavoriteIds(userId: string): Promise<number[]> {
  await initFavoritesTables();
  const sql = neon(getDatabaseUrl());

  const rows = await sql`
    SELECT product_id FROM product_favorites WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
  return rows.map((r) => r.product_id as number);
}

/**
 * Get all store slugs favorited by a user.
 */
export async function getUserStoreFavoriteIds(userId: string): Promise<string[]> {
  await initFavoritesTables();
  const sql = neon(getDatabaseUrl());

  const rows = await sql`
    SELECT store_slug FROM store_favorites WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
  return rows.map((r) => r.store_slug as string);
}

/**
 * Get full product data for all of a user's favorited products.
 */
export async function getUserFavoritedProducts(userId: string): Promise<DBProduct[]> {
  await initFavoritesTables();
  const sql = neon(getDatabaseUrl());

  const rows = await sql`
    SELECT p.* FROM products p
    JOIN product_favorites pf ON pf.product_id = p.id
    WHERE pf.user_id = ${userId}
    ORDER BY pf.created_at DESC
  `;
  return rows as DBProduct[];
}

/**
 * Get all users who favorited a given product (for notifications).
 */
export async function getUsersWhoFavoritedProduct(
  productId: number
): Promise<Array<{ user_id: string; email: string; notification_emails_enabled: boolean }>> {
  await initFavoritesTables();
  const sql = neon(getDatabaseUrl());

  const rows = await sql`
    SELECT u.id as user_id, u.email, u.notification_emails_enabled
    FROM users u
    JOIN product_favorites pf ON pf.user_id = u.id
    WHERE pf.product_id = ${productId}
  `;
  return rows as Array<{ user_id: string; email: string; notification_emails_enabled: boolean }>;
}
