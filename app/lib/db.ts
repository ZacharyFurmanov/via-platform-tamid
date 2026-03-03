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
  variant_id: string | null;
  shopify_product_id: string | null;
  collabs_link: string | null;
  size: string | null;
  insider_notified: boolean;
  synced_at: Date;
  created_at: Date;
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

  // Add variant_id column for Shopify direct checkout URLs
  await sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_id TEXT
  `;

  // Add created_at column (set explicitly during sync, NULL for existing products)
  await sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE
  `;

  // Add shopify_product_id for Collabs affiliate link generation
  await sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS shopify_product_id TEXT
  `;

  // Add collabs_link: per-product collabs.shop affiliate URL
  await sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS collabs_link TEXT
  `;

  // Add size column for product sizing info (e.g. "38.5", "M", "US 8")
  await sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS size TEXT
  `;

  // Add insider_notified column to track which products have been emailed to Insiders
  await sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS insider_notified BOOLEAN DEFAULT FALSE
  `;

  // Clear created_at for existing products so they don't all appear as new arrivals
  // (only products inserted during subsequent syncs will have a non-NULL created_at)
  await sql`
    UPDATE products SET created_at = NULL WHERE created_at IS NOT NULL
      AND created_at < NOW() - INTERVAL '1 hour'
  `;

  // Index for new arrivals queries
  await sql`
    CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC)
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
    variantId?: string;
    shopifyProductId?: string;
    size?: string;
  }>
) {
  const sql = neon(getDatabaseUrl());

  // Check if this store already has products (i.e. not a first-time sync).
  // Only products appearing for the first time in a subsequent sync are
  // genuine "new arrivals" on the store — not all products from a brand-new store.
  const existing = await sql`
    SELECT 1 FROM products WHERE store_slug = ${storeSlug} LIMIT 1
  `;
  const isExistingStore = existing.length > 0;

  // Upsert each product (preserves id for existing rows)
  const titles: string[] = [];
  for (const product of products) {
    titles.push(product.title);
    const imagesJson = product.images ? JSON.stringify(product.images) : null;
    await sql`
      INSERT INTO products (store_slug, store_name, title, price, currency, image, images, external_url, description, variant_id, shopify_product_id, size, synced_at, created_at)
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
        ${product.variantId || null},
        ${product.shopifyProductId || null},
        ${product.size || null},
        NOW(),
        ${isExistingStore ? new Date() : null}
      )
      ON CONFLICT (store_slug, title) DO UPDATE SET
        store_name = EXCLUDED.store_name,
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        image = EXCLUDED.image,
        images = EXCLUDED.images,
        external_url = EXCLUDED.external_url,
        description = EXCLUDED.description,
        variant_id = COALESCE(EXCLUDED.variant_id, products.variant_id),
        shopify_product_id = COALESCE(EXCLUDED.shopify_product_id, products.shopify_product_id),
        size = COALESCE(EXCLUDED.size, products.size),
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
    SELECT * FROM products
    WHERE store_slug = ${storeSlug}
      AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
    ORDER BY id
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
    SELECT * FROM products
    WHERE shopify_product_id IS NULL OR collabs_link IS NOT NULL
    ORDER BY store_slug, id
  `;
  return result as DBProduct[];
}

/**
 * Get recommended products, excluding a specific product by ID.
 * Uses random row sampling (no full-table sort) for speed, then limits.
 */
export async function getRecommendedProducts(
  excludeId: number,
  limit: number = 20
): Promise<DBProduct[]> {
  const sql = neon(getDatabaseUrl());

  const result = await sql`
    SELECT * FROM products TABLESAMPLE BERNOULLI(50)
    WHERE id != ${excludeId}
      AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
    LIMIT ${limit}
  `;
  return result as DBProduct[];
}

/**
 * Get recently added products (new arrivals).
 * Members see all products from the last `days` days.
 * Non-members only see products older than 24 hours (the early-access window).
 */
export async function getNewArrivals(
  limit: number = 12,
  days: number = 7,
  isMember: boolean = false
): Promise<DBProduct[]> {
  const sql = neon(getDatabaseUrl());

  try {
    const result = isMember
      ? await sql`
          SELECT * FROM products
          WHERE created_at IS NOT NULL
            AND created_at >= NOW() - make_interval(days => ${days})
            AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT * FROM products
          WHERE created_at IS NOT NULL
            AND created_at >= NOW() - make_interval(days => ${days})
            AND created_at <= NOW() - interval '24 hours'
            AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;

    // If no genuine new arrivals yet, show a random sample as fallback
    if (result.length === 0) {
      try {
        const fallback = await sql`
          SELECT * FROM products TABLESAMPLE BERNOULLI(50)
          WHERE shopify_product_id IS NULL OR collabs_link IS NOT NULL
          LIMIT ${limit}
        `;
        return fallback as DBProduct[];
      } catch {
        return [];
      }
    }
    return result as DBProduct[];
  } catch {
    // created_at column may not exist yet — try a simple fallback
    try {
      const fallback = await sql`
        SELECT * FROM products TABLESAMPLE BERNOULLI(50)
        WHERE shopify_product_id IS NULL OR collabs_link IS NOT NULL
        LIMIT ${limit}
      `;
      return fallback as DBProduct[];
    } catch {
      return [];
    }
  }
}

/**
 * Get products added in the last 24 hours — the VIA Insider early-access window.
 * Only shown to active members.
 */
export async function getInsiderProducts(limit: number = 48): Promise<DBProduct[]> {
  const sql = neon(getDatabaseUrl());

  try {
    const result = await sql`
      SELECT * FROM products
      WHERE created_at IS NOT NULL
        AND created_at >= NOW() - interval '24 hours'
        AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return result as DBProduct[];
  } catch {
    return [];
  }
}

/**
 * Get new products that have not yet been emailed to Insiders.
 * Only products with a created_at (i.e. genuinely new, not pre-existing) qualify.
 */
export async function getUnnotifiedInsiderProducts(limit: number = 50): Promise<DBProduct[]> {
  const sql = neon(getDatabaseUrl());
  try {
    const result = await sql`
      SELECT * FROM products
      WHERE created_at IS NOT NULL
        AND insider_notified = FALSE
        AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return result as DBProduct[];
  } catch {
    return [];
  }
}

/**
 * Mark a list of product IDs as having been included in an Insider new-arrivals email.
 */
export async function markProductsAsInsiderNotified(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const sql = neon(getDatabaseUrl());
  await sql`
    UPDATE products SET insider_notified = TRUE WHERE id = ANY(${ids})
  `;
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

/**
 * Update the collabs_link for a product by its database ID.
 * Called by the admin generate-collabs-links endpoint.
 */
export async function updateCollabsLink(id: number, collabsLink: string): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await sql`
    UPDATE products SET collabs_link = ${collabsLink} WHERE id = ${id}
  `;
}

/**
 * Get all products for Collabs-enabled stores that have a shopify_product_id
 * but no collabs_link yet. Optionally filtered to a specific store.
 */
export async function getProductsMissingCollabsLink(storeSlug?: string): Promise<DBProduct[]> {
  const sql = neon(getDatabaseUrl());
  const result = storeSlug
    ? await sql`
        SELECT * FROM products
        WHERE store_slug = ${storeSlug}
          AND shopify_product_id IS NOT NULL
          AND collabs_link IS NULL
        ORDER BY id
      `
    : await sql`
        SELECT * FROM products
        WHERE shopify_product_id IS NOT NULL
          AND collabs_link IS NULL
        ORDER BY store_slug, id
      `;
  return result as DBProduct[];
}

/**
 * Look up the collabs_link for a product by its database ID.
 * Returns null if the product doesn't exist or has no collabs_link.
 */
export async function getCollabsLink(id: number): Promise<string | null> {
  const sql = neon(getDatabaseUrl());
  const result = await sql`
    SELECT collabs_link FROM products WHERE id = ${id} LIMIT 1
  `;
  return (result[0]?.collabs_link as string | null) ?? null;
}

/**
 * Get per-store breakdown of shopify_product_id and collabs_link coverage.
 * Used for debugging sync issues.
 */
export async function getShopifyIdCoverage(
  storeSlugs: string[]
): Promise<Record<string, { total: number; withId: number; withoutId: number; withCollabsLink: number }>> {
  const sql = neon(getDatabaseUrl());
  if (storeSlugs.length === 0) return {};
  const rows = await sql`
    SELECT
      store_slug,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE shopify_product_id IS NOT NULL)::int AS with_id,
      COUNT(*) FILTER (WHERE shopify_product_id IS NULL)::int AS without_id,
      COUNT(*) FILTER (WHERE collabs_link IS NOT NULL)::int AS with_collabs_link
    FROM products
    WHERE store_slug = ANY(${storeSlugs})
    GROUP BY store_slug
  `;
  const result: Record<string, { total: number; withId: number; withoutId: number; withCollabsLink: number }> = {};
  for (const row of rows) {
    result[row.store_slug as string] = {
      total: row.total as number,
      withId: row.with_id as number,
      withoutId: row.without_id as number,
      withCollabsLink: row.with_collabs_link as number,
    };
  }
  return result;
}

/**
 * Get any collabs link for a given store slug.
 * Used to extract the dt_id tracking parameter for cart checkout URLs.
 */
export async function getAnyCollabsLinkForStore(storeSlug: string): Promise<string | null> {
  const sql = neon(getDatabaseUrl());
  const result = await sql`
    SELECT collabs_link FROM products
    WHERE store_slug = ${storeSlug} AND collabs_link IS NOT NULL
    LIMIT 1
  `;
  return (result[0]?.collabs_link as string | null) ?? null;
}

/**
 * Get sample products that have collabs links, for verification.
 */
export async function getProductsWithCollabsLinks(storeSlug?: string, limit = 5): Promise<DBProduct[]> {
  const sql = neon(getDatabaseUrl());
  const result = storeSlug
    ? await sql`
        SELECT * FROM products
        WHERE store_slug = ${storeSlug}
          AND collabs_link IS NOT NULL
        ORDER BY id
        LIMIT ${limit}
      `
    : await sql`
        SELECT * FROM products
        WHERE collabs_link IS NOT NULL
        ORDER BY store_slug, id
        LIMIT ${limit}
      `;
  return result as DBProduct[];
}

/**
 * Update the collabs_link for a product by its Shopify product ID.
 * Used when importing links generated from the Collabs browser script.
 */
export async function updateCollabsLinkByShopifyProductId(
  shopifyProductId: string,
  collabsLink: string
): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await sql`
    UPDATE products
    SET collabs_link = ${collabsLink}
    WHERE shopify_product_id = ${shopifyProductId}
  `;
}
