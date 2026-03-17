import { neon } from "@neondatabase/serverless";

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set.");
  return url;
};

async function ensureTable() {
  const sql = neon(getDatabaseUrl());
  await sql`
    CREATE TABLE IF NOT EXISTS product_cart_adds (
      product_id INTEGER PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0
    )
  `;
}

async function ensureUserCartTable() {
  const sql = neon(getDatabaseUrl());
  await sql`
    CREATE TABLE IF NOT EXISTS user_cart_items (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      product_id INT NOT NULL,
      product_title TEXT,
      product_image TEXT,
      store_name TEXT,
      price NUMERIC,
      currency TEXT DEFAULT 'USD',
      store_slug TEXT,
      added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      email_sent_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(user_id, product_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_cart_added_at ON user_cart_items(added_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_cart_user ON user_cart_items(user_id)`;
}

export async function getProductCartCount(productId: number): Promise<number> {
  const sql = neon(getDatabaseUrl());
  await ensureTable();
  const result = await sql`SELECT count FROM product_cart_adds WHERE product_id = ${productId}`;
  return (result[0]?.count as number) ?? 0;
}

export async function incrementProductCartCount(productId: number): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await ensureTable();
  await sql`
    INSERT INTO product_cart_adds (product_id, count) VALUES (${productId}, 1)
    ON CONFLICT (product_id) DO UPDATE SET count = product_cart_adds.count + 1
  `;
}

export async function logUserCartItem(params: {
  userId: string;
  productId: number;
  productTitle: string;
  productImage: string;
  storeName: string;
  price: number;
  currency: string;
  storeSlug: string;
}): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await ensureUserCartTable();
  await sql`
    INSERT INTO user_cart_items (user_id, product_id, product_title, product_image, store_name, price, currency, store_slug, added_at)
    VALUES (${params.userId}, ${params.productId}, ${params.productTitle}, ${params.productImage}, ${params.storeName}, ${params.price}, ${params.currency}, ${params.storeSlug}, NOW())
    ON CONFLICT (user_id, product_id) DO UPDATE SET added_at = NOW(), email_sent_at = NULL
  `;
}

export type AbandonedCartItem = {
  user_id: string;
  email: string;
  product_id: number;
  product_title: string;
  product_image: string | null;
  store_name: string;
  store_slug: string;
  price: number;
  currency: string;
  added_at: string;
};

export async function getAbandonedCartItems(): Promise<AbandonedCartItem[]> {
  const sql = neon(getDatabaseUrl());
  await ensureUserCartTable();
  const rows = await sql`
    SELECT
      uc.user_id,
      u.email,
      uc.product_id,
      uc.product_title,
      uc.product_image,
      uc.store_name,
      uc.store_slug,
      uc.price,
      uc.currency,
      uc.added_at
    FROM user_cart_items uc
    JOIN users u ON u.id = uc.user_id
    WHERE uc.email_sent_at IS NULL
      AND uc.added_at < NOW() - INTERVAL '5 hours'
      AND u.email IS NOT NULL
  `;
  return rows as AbandonedCartItem[];
}

export async function markAbandonedCartEmailSent(userId: string, productId: number): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await sql`
    UPDATE user_cart_items SET email_sent_at = NOW()
    WHERE user_id = ${userId} AND product_id = ${productId}
  `;
}
