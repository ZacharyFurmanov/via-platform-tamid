import { neon } from "@neondatabase/serverless";
import { unstable_cache } from "next/cache";

// Stores temporarily removed from VYA. Products from these slugs are hidden site-wide.
// To re-enable a store: remove its slug from this array and uncomment it in stores.ts.
export const DISABLED_STORE_SLUGS: string[] = [
  "velvet-archive",
];

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
  compare_at_price: number | null;
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

  // Add compare_at_price for sale price display
  await sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price DECIMAL(10, 2)
  `;

  // Index for new arrivals queries
  await sql`
    CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC)
  `;

  // Remove products synced under the old computed slug for Bloda's Choice
  // (computed: "bloda-s-choice", correct: "blodas-choice")
  await sql`DELETE FROM products WHERE store_slug = 'bloda-s-choice'`;

  // Deduplicate any existing rows before enforcing the unique constraint
  await sql`
    DELETE FROM products
    WHERE id NOT IN (
      SELECT MIN(id) FROM products GROUP BY store_slug, title
    )
  `;

  // Enforce unique (store_slug, title) — safe to run on existing tables
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_store_title
    ON products(store_slug, title)
  `;

  // Composite index for store detail pages (filter by store + available for purchase)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_products_store_collabs
    ON products(store_slug, collabs_link)
    WHERE shopify_product_id IS NULL OR collabs_link IS NOT NULL
  `;

  // Index for insider notification queries
  await sql`
    CREATE INDEX IF NOT EXISTS idx_products_insider_notified
    ON products(insider_notified, created_at DESC)
    WHERE insider_notified = FALSE
  `;

  // Persistent record of every (store_slug, title) that has ever been shown to Insiders.
  // Survives product deletions so re-inserted products are never shown as "new" again.
  await sql`
    CREATE TABLE IF NOT EXISTS insider_seen_products (
      store_slug TEXT NOT NULL,
      title      TEXT NOT NULL,
      PRIMARY KEY (store_slug, title)
    )
  `;
}

/**
 * Sync products for a store using upsert to preserve stable product IDs.
 * Products no longer in the feed are removed; existing ones are updated in place.
 */
export type PriceDrop = {
  productId: number;
  title: string;
  image: string | null;
  oldPrice: number;
  newPrice: number;
  storeSlug: string;
  storeName: string;
};

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
    compareAtPrice?: number | null;
  }>,
  options?: { excludeKeywords?: string[]; excludeTitles?: string[] }
): Promise<{ count: number; priceDrops: PriceDrop[] }> {
  const sql = neon(getDatabaseUrl());

  // Titles that should never appear on VYA — blocked globally across all stores.
  // Checked as case-insensitive substrings.
  const BLOCKED_TITLE_PATTERNS = [
    "gift card",
    "authentication",
    "authentification",
    "item authentication",
    "authentication service",
    "authentication fee",
  ];

  const isBlocked = (title: string) => {
    const lower = title.toLowerCase();
    return BLOCKED_TITLE_PATTERNS.some((p) => lower.includes(p));
  };

  // Remove any previously-synced blocked products for this store
  await sql`
    DELETE FROM products
    WHERE store_slug = ${storeSlug}
      AND (
        title ILIKE '%gift card%'
        OR title ILIKE '%authentication%'
        OR title ILIKE '%authentification%'
      )
  `;

  // Remove store-specific excluded products that may already be in the DB
  const excludeKws = (options?.excludeKeywords ?? []).map((k) => k.toLowerCase());
  const excludeTitles = new Set((options?.excludeTitles ?? []).map((t) => t.toLowerCase()));
  if (excludeKws.length > 0 || excludeTitles.size > 0) {
    const existing = await sql`SELECT title FROM products WHERE store_slug = ${storeSlug}`;
    const toDelete = (existing as { title: string }[])
      .map((r) => r.title)
      .filter((t) => {
        const lower = t.toLowerCase();
        return excludeTitles.has(lower) || excludeKws.some((kw) => lower.includes(kw));
      });
    for (const t of toDelete) {
      await sql`DELETE FROM products WHERE store_slug = ${storeSlug} AND lower(title) = lower(${t})`;
    }
  }

  // Snapshot current prices so we can detect drops after upsert
  const oldRows = await sql`
    SELECT id, title, price, image FROM products WHERE store_slug = ${storeSlug}
  `;
  const oldByTitle = new Map<string, { id: number; price: number; image: string | null }>();
  for (const row of oldRows) {
    oldByTitle.set(row.title as string, {
      id: row.id as number,
      price: Number(row.price),
      image: row.image as string | null,
    });
  }

  // Load titles that have ever been shown to Insiders for this store.
  // If a product was deleted and re-inserted, we restore insider_notified = TRUE
  // so it doesn't appear on the Insider page as a "new" arrival again.
  const seenRows = await sql`
    SELECT title FROM insider_seen_products WHERE store_slug = ${storeSlug}
  `;
  const prevSeenTitles = new Set(seenRows.map((r) => r.title as string));

  // Upsert each product (preserves id for existing rows)
  const titles: string[] = [];
  for (const product of products) {
    if (isBlocked(product.title)) continue;
    titles.push(product.title);
    const imagesJson = product.images ? JSON.stringify(product.images) : null;
    const wasSeenOnInsider = prevSeenTitles.has(product.title);
    await sql`
      INSERT INTO products (store_slug, store_name, title, price, currency, image, images, external_url, description, variant_id, shopify_product_id, size, compare_at_price, insider_notified, synced_at, created_at)
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
        ${product.compareAtPrice ?? null},
        ${wasSeenOnInsider},
        NOW(),
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
        variant_id = COALESCE(EXCLUDED.variant_id, products.variant_id),
        shopify_product_id = COALESCE(EXCLUDED.shopify_product_id, products.shopify_product_id),
        size = COALESCE(EXCLUDED.size, products.size),
        compare_at_price = EXCLUDED.compare_at_price,
        synced_at = NOW()
    `;
  }

  // Detect price drops for products that existed before this sync
  const priceDrops: PriceDrop[] = [];
  for (const product of products) {
    if (isBlocked(product.title)) continue;
    const old = oldByTitle.get(product.title);
    if (old && product.price < old.price) {
      priceDrops.push({
        productId: old.id,
        title: product.title,
        image: product.image || old.image || null,
        oldPrice: old.price,
        newPrice: product.price,
        storeSlug,
        storeName,
      });
    }
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

  return { count: products.length, priceDrops };
}

/**
 * Get all products for a specific store.
 */
export async function getProductsByStore(storeSlug: string): Promise<DBProduct[]> {
  const sql = neon(getDatabaseUrl());

  const result = await sql`
      SELECT * FROM products
      WHERE store_slug = ${storeSlug}
        AND (
          shopify_product_id IS NULL
          OR collabs_link IS NOT NULL
        )
        AND title NOT ILIKE '%gift card%'
        AND image IS NOT NULL AND image != ''
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
    SELECT * FROM products
    WHERE id = ${id}
      AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
      AND (${DISABLED_STORE_SLUGS.length} = 0 OR store_slug != ALL(${DISABLED_STORE_SLUGS}))
    LIMIT 1
  `;
  return (result[0] as DBProduct) ?? null;
}

/**
 * Get all products from all stores.
 */
const _getAllProductsUncached = async (): Promise<DBProduct[]> => {
  const sql = neon(getDatabaseUrl());
  const query = async () => sql`
      SELECT * FROM products
      WHERE (
        shopify_product_id IS NULL
        OR collabs_link IS NOT NULL
      )
        AND title NOT ILIKE '%gift card%'
        AND image IS NOT NULL AND image != ''
        AND (${DISABLED_STORE_SLUGS.length} = 0 OR store_slug != ALL(${DISABLED_STORE_SLUGS}))
      ORDER BY store_slug, id
    `;
  try {
    return (await query()) as DBProduct[];
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("fetch failed")) {
      await new Promise((r) => setTimeout(r, 2000));
      return (await query()) as DBProduct[];
    }
    throw err;
  }
};

// Not cached — result exceeds Next.js 2MB unstable_cache limit
export const getAllProducts = _getAllProductsUncached;

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
      AND (
        shopify_product_id IS NULL
        OR collabs_link IS NOT NULL
      )
      AND title NOT ILIKE '%gift card%'
      AND image IS NOT NULL AND image != ''
      AND (${DISABLED_STORE_SLUGS.length} = 0 OR store_slug != ALL(${DISABLED_STORE_SLUGS}))
    LIMIT ${limit}
  `;
  return result as DBProduct[];
}

/**
 * Get products matching a title keyword (brand name, item type, etc.)
 * Used to seed the recommendation pool with contextually relevant items.
 */
export async function getProductsByTitleKeyword(
  keyword: string,
  excludeId: number,
  limit: number = 40
): Promise<DBProduct[]> {
  const sql = neon(getDatabaseUrl());
  const pattern = `%${keyword}%`;
  const result = await sql`
    SELECT * FROM products
    WHERE id != ${excludeId}
      AND title ILIKE ${pattern}
      AND (
        shopify_product_id IS NULL
        OR collabs_link IS NOT NULL
      )
      AND title NOT ILIKE '%gift card%'
      AND image IS NOT NULL AND image != ''
      AND (${DISABLED_STORE_SLUGS.length} = 0 OR store_slug != ALL(${DISABLED_STORE_SLUGS}))
    LIMIT ${limit}
  `;
  return result as DBProduct[];
}

/**
 * Get recently added products (new arrivals).
 * maxPerStore caps results per store for diversity (use 2 for homepage carousel, large number for full page).
 */
const _getNewArrivalsUncached = async (limit: number, days: number, maxPerStore = 2): Promise<DBProduct[]> => {
  const sql = neon(getDatabaseUrl());
  try {
    const result = await sql`
      WITH click_counts AS (
        SELECT store_slug, product_name, COUNT(*)::int AS click_count
        FROM clicks
        GROUP BY store_slug, product_name
      ),
      pool AS (
        SELECT p.*,
          COALESCE(cc.click_count, 0) AS click_count,
          ROW_NUMBER() OVER (
            PARTITION BY p.store_slug
            ORDER BY p.created_at DESC, p.id DESC
          ) AS store_rank
        FROM products p
        LEFT JOIN click_counts cc
          ON cc.store_slug = p.store_slug AND cc.product_name = p.title
        WHERE p.created_at IS NOT NULL
          AND p.created_at >= NOW() - make_interval(days => ${days})
          AND (p.shopify_product_id IS NULL OR p.collabs_link IS NOT NULL)
          AND p.title NOT ILIKE '%gift card%'
          AND p.image IS NOT NULL AND p.image != ''
          AND (${DISABLED_STORE_SLUGS.length} = 0 OR p.store_slug != ALL(${DISABLED_STORE_SLUGS}))
      )
      SELECT * FROM pool
      WHERE store_rank <= ${maxPerStore}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit}
    `;
    return result as DBProduct[];
  } catch {
    return [];
  }
};

export const getNewArrivals = unstable_cache(
  _getNewArrivalsUncached,
  ["new-arrivals"],
  { revalidate: 600 } // 10 minutes
);


/**
 * Get brand counts directly from the DB (fast aggregation, no full table scan in JS).
 */
export async function getBrandCounts(): Promise<Array<{ brand: string; count: number }>> {
  const sql = neon(getDatabaseUrl());
  try {
    const result = await sql`
      SELECT brand, COUNT(*)::int AS count
      FROM products
      WHERE brand IS NOT NULL
        AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
        AND title NOT ILIKE '%gift card%'
      GROUP BY brand
      ORDER BY count DESC
    `;
    return result as Array<{ brand: string; count: number }>;
  } catch {
    return [];
  }
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
 * Delete products that have a shopify_product_id but no collabs_link and
 * no created_at (meaning they predate Collabs support and have never been
 * visible on VYA). Safe to remove — they'll be re-added by the next sync
 * if the store enrolls them in Collabs.
 */
export async function deletePermanentlyStuckProducts(storeSlug?: string): Promise<number> {
  const sql = neon(getDatabaseUrl());
  const result = storeSlug
    ? await sql`
        DELETE FROM products
        WHERE store_slug = ${storeSlug}
          AND shopify_product_id IS NOT NULL
          AND collabs_link IS NULL
          AND created_at IS NULL
        RETURNING id
      `
    : await sql`
        DELETE FROM products
        WHERE shopify_product_id IS NOT NULL
          AND collabs_link IS NULL
          AND created_at IS NULL
        RETURNING id
      `;
  return result.length;
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
