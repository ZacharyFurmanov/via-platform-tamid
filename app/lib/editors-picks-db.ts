import { neon } from "@neondatabase/serverless";
import { COLLECTIONS } from "./collections-config";
export { COLLECTIONS } from "./collections-config";
export type { CollectionSlug } from "./collections-config";

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set.");
  return url;
};

// Sentinel value — no week concept, picks are always live
const FIXED_WEEK = "1970-01-01";

let _initialized = false;

export type PickWithProduct = {
  pickId: number;
  position: number;
  product: {
    id: number;
    storeSlug: string;
    storeName: string;
    title: string;
    price: number;
    image: string | null;
    images: string | null;
    size: string | null;
    externalUrl: string | null;
  };
};

export async function initEditorsPicks(): Promise<void> {
  if (_initialized) return;
  const sql = neon(getDatabaseUrl());
  await sql`
    CREATE TABLE IF NOT EXISTS editors_picks (
      id         SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      week_start DATE NOT NULL,
      position   SMALLINT NOT NULL DEFAULT 0,
      added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(product_id, week_start)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_editors_picks_week ON editors_picks(week_start)`;
  // Migration: consolidate all picks to the fixed sentinel week
  await sql`UPDATE editors_picks SET week_start = ${FIXED_WEEK} WHERE week_start != ${FIXED_WEEK}`;

  // Add collection_slug column (migration-safe)
  await sql`ALTER TABLE editors_picks ADD COLUMN IF NOT EXISTS collection_slug TEXT NOT NULL DEFAULT 'editors-picks'`;

  // Drop old unique constraint that only allowed one pick per product globally,
  // then add a per-collection unique constraint so a product can appear in multiple collections
  await sql`ALTER TABLE editors_picks DROP CONSTRAINT IF EXISTS editors_picks_product_id_week_start_key`;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_editors_picks_product_collection
    ON editors_picks(product_id, collection_slug)
  `;
  _initialized = true;
}

export async function getAllEditorsPicks(collectionSlug: string = "editors-picks"): Promise<PickWithProduct[]> {
  const sql = neon(getDatabaseUrl());
  await initEditorsPicks();

  const rows = await sql`
    SELECT
      ep.id AS pick_id,
      ep.position,
      p.id AS product_id,
      p.store_slug,
      p.store_name,
      p.title,
      p.price,
      p.image,
      p.images,
      p.size,
      p.external_url,
      COUNT(c.id) AS click_count
    FROM editors_picks ep
    JOIN products p ON p.id = ep.product_id
    LEFT JOIN clicks c ON c.product_id = (p.store_slug || '-' || p.id::text)
    WHERE ep.collection_slug = ${collectionSlug}
      AND (p.shopify_product_id IS NULL OR p.collabs_link IS NOT NULL)
    GROUP BY ep.id, ep.position, p.id, p.store_slug, p.store_name, p.title, p.price, p.image, p.images, p.size, p.external_url
    ORDER BY click_count DESC, ep.position ASC
  `;

  return rows.map((r) => ({
    pickId: r.pick_id as number,
    position: r.position as number,
    product: {
      id: r.product_id as number,
      storeSlug: r.store_slug as string,
      storeName: r.store_name as string,
      title: r.title as string,
      price: Number(r.price),
      image: r.image as string | null,
      images: r.images as string | null,
      size: r.size as string | null,
      externalUrl: r.external_url as string | null,
    },
  }));
}

/** Returns picks for ALL collections in parallel — used on homepage. */
export async function getAllCollectionPicks(): Promise<Record<string, PickWithProduct[]>> {
  await initEditorsPicks();
  const sql = neon(getDatabaseUrl());

  const rows = await sql`
    SELECT
      ep.id AS pick_id,
      ep.collection_slug,
      ep.position,
      p.id AS product_id,
      p.store_slug,
      p.store_name,
      p.title,
      p.price,
      p.image,
      p.images,
      p.size,
      p.external_url,
      COUNT(c.id) AS click_count
    FROM editors_picks ep
    JOIN products p ON p.id = ep.product_id
    LEFT JOIN clicks c ON c.product_id = (p.store_slug || '-' || p.id::text)
    WHERE (p.shopify_product_id IS NULL OR p.collabs_link IS NOT NULL)
    GROUP BY ep.id, ep.collection_slug, ep.position, p.id, p.store_slug, p.store_name, p.title, p.price, p.image, p.images, p.size, p.external_url
    ORDER BY ep.collection_slug, click_count DESC, ep.position ASC
  `;

  const result: Record<string, PickWithProduct[]> = {};
  for (const col of COLLECTIONS) result[col.slug] = [];

  for (const r of rows) {
    const slug = r.collection_slug as string;
    if (!result[slug]) result[slug] = [];
    result[slug].push({
      pickId: r.pick_id as number,
      position: r.position as number,
      product: {
        id: r.product_id as number,
        storeSlug: r.store_slug as string,
        storeName: r.store_name as string,
        title: r.title as string,
        price: Number(r.price),
        image: r.image as string | null,
        images: r.images as string | null,
        size: r.size as string | null,
        externalUrl: r.external_url as string | null,
      },
    });
  }

  return result;
}

export async function addEditorsPick(productId: number, collectionSlug: string = "editors-picks"): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await initEditorsPicks();

  const countRows = await sql`
    SELECT COALESCE(MAX(position), -1)::int AS max_pos
    FROM editors_picks
    WHERE collection_slug = ${collectionSlug}
  `;
  const nextPos = (countRows[0].max_pos as number) + 1;

  await sql`
    INSERT INTO editors_picks (product_id, week_start, position, collection_slug)
    VALUES (${productId}, ${FIXED_WEEK}, ${nextPos}, ${collectionSlug})
    ON CONFLICT (product_id, collection_slug) DO NOTHING
  `;
}

export async function removeEditorsPick(productId: number, collectionSlug: string = "editors-picks"): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await initEditorsPicks();
  await sql`
    DELETE FROM editors_picks
    WHERE product_id = ${productId} AND collection_slug = ${collectionSlug}
  `;
}

type ProductResult = {
  id: number;
  storeSlug: string;
  storeName: string;
  title: string;
  price: number;
  image: string | null;
};

function mapProductRow(r: Record<string, unknown>): ProductResult {
  return {
    id: r.id as number,
    storeSlug: r.store_slug as string,
    storeName: r.store_name as string,
    title: r.title as string,
    price: Number(r.price),
    image: r.image as string | null,
  };
}

export async function getAllProducts(): Promise<ProductResult[]> {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    SELECT id, store_slug, store_name, title, price, image
    FROM products
    ORDER BY store_slug, title
  `;
  return rows.map(mapProductRow);
}

export async function getProductsByStore(storeSlug: string, limit = 300): Promise<ProductResult[]> {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    SELECT id, store_slug, store_name, title, price, image
    FROM products
    WHERE store_slug = ${storeSlug}
    ORDER BY title
    LIMIT ${limit}
  `;
  return rows.map(mapProductRow);
}

export async function searchProducts(q: string, storeSlug?: string): Promise<ProductResult[]> {
  const sql = neon(getDatabaseUrl());

  const rows = storeSlug
    ? await sql`
        SELECT id, store_slug, store_name, title, price, image
        FROM products
        WHERE title ILIKE ${"%" + q + "%"}
          AND store_slug = ${storeSlug}
        ORDER BY title
        LIMIT 50
      `
    : await sql`
        SELECT id, store_slug, store_name, title, price, image
        FROM products
        WHERE title ILIKE ${"%" + q + "%"}
        ORDER BY title
        LIMIT 50
      `;

  return rows.map(mapProductRow);
}
