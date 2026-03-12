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
