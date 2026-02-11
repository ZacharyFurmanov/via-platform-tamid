import { neon } from "@neondatabase/serverless";

// Get the database URL from environment variable
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL or POSTGRES_URL environment variable is not set. " +
        "Please set up Vercel Postgres or Neon database."
    );
  }
  return url;
};

export type DBProduct = {
  id: number;
  store_slug: string;
  store_name: string;
  title: string;
  price: number;
  currency: string;
  image: string | null;
  images: string | null;
  external_url: string | null;
  description: string | null;
  synced_at: Date;
};

/**
 * Initialize the products table if it doesn't exist
 */
export async function initDatabase() {
  const sql = neon(getDatabaseUrl());

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      store_slug VARCHAR(255) NOT NULL,
      store_name VARCHAR(255) NOT NULL,
      title TEXT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      image TEXT,
      external_url TEXT,
      synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(store_slug, title)
    )
  `;

  // Create index for faster queries by store
  await sql`
    CREATE INDEX IF NOT EXISTS idx_products_store_slug ON products(store_slug)
  `;

  // Add description column if it doesn't exist (migration for existing tables)
  await sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT
  `;

  // Add images column if it doesn't exist (JSON array of image URLs)
  await sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT
  `;
}

/**
 * Sync products for a store using upsert to preserve stable product IDs.
 * Products no longer in the feed are removed; existing ones are updated in place.
 */
export async function syncProducts(
  storeSlug: string,
  storeName: string,
  products: Array<{
    title: string;
    price: number;
    currency?: string;
    image?: string;
    images?: string[];
    externalUrl?: string;
    description?: string;
  }>
) {
  const sql = neon(getDatabaseUrl());

  // Upsert each product (preserves id for existing rows)
  const titles: string[] = [];
  for (const product of products) {
    titles.push(product.title);
    const imagesJson = product.images ? JSON.stringify(product.images) : null;
    await sql`
      INSERT INTO products (store_slug, store_name, title, price, currency, image, images, external_url, description, synced_at)
      VALUES (
        ${storeSlug},
        ${storeName},
        ${product.title},
        ${product.price},
        ${product.currency || "USD"},
        ${product.image || null},
        ${imagesJson},
        ${product.externalUrl || null},
        ${product.description || null},
        NOW()
      )
      ON CONFLICT (store_slug, title) DO UPDATE SET
        store_name = EXCLUDED.store_name,
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        image = EXCLUDED.image,
        images = EXCLUDED.images,
        external_url = EXCLUDED.external_url,
        description = EXCLUDED.description,
        synced_at = NOW()
    `;
  }

  // Remove products that are no longer in the feed
  if (titles.length > 0) {
    await sql`
      DELETE FROM products
      WHERE store_slug = ${storeSlug}
        AND title != ALL(${titles})
    `;
  } else {
    await sql`DELETE FROM products WHERE store_slug = ${storeSlug}`;
  }

  return products.length;
}

/**
 * Get all products for a specific store
 */
export async function getProductsByStore(storeSlug: string): Promise<DBProduct[]> {
  const sql = neon(getDatabaseUrl());

  const result = await sql`
    SELECT * FROM products WHERE store_slug = ${storeSlug} ORDER BY id
  `;
  return result as DBProduct[];
}

/**
 * Get a single product by its database ID
 */
export async function getProductById(id: number): Promise<DBProduct | null> {
  const sql = neon(getDatabaseUrl());

  const result = await sql`
    SELECT * FROM products WHERE id = ${id} LIMIT 1
  `;
  return (result[0] as DBProduct) ?? null;
}

/**
 * Get all products from all stores
 */
export async function getAllProducts(): Promise<DBProduct[]> {
  const sql = neon(getDatabaseUrl());

  const result = await sql`
    SELECT * FROM products ORDER BY store_slug, id
  `;
  return result as DBProduct[];
}

/**
 * Get recommended products, excluding a specific product by ID.
 * Returns a pool of products to filter by category in application code.
 */
export async function getRecommendedProducts(
  excludeId: number,
  limit: number = 20
): Promise<DBProduct[]> {
  const sql = neon(getDatabaseUrl());

  const result = await sql`
    SELECT * FROM products
    WHERE id != ${excludeId}
    ORDER BY RANDOM()
    LIMIT ${limit}
  `;
  return result as DBProduct[];
}

/**
 * Get list of all synced stores
 */
export async function getSyncedStores(): Promise<
  Array<{ store_slug: string; store_name: string; product_count: number; last_synced: Date }>
> {
  const sql = neon(getDatabaseUrl());

  const result = await sql`
    SELECT
      store_slug,
      store_name,
      COUNT(*) as product_count,
      MAX(synced_at) as last_synced
    FROM products
    GROUP BY store_slug, store_name
    ORDER BY store_name
  `;
  return result as any;
}
