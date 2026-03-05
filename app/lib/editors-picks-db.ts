import { neon } from "@neondatabase/serverless";

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set.");
  return url;
};

/** Most recent past Sunday (UTC) — used by the public page */
export function getCurrentSunday(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 0 : day;
  const sunday = new Date(now);
  sunday.setUTCDate(now.getUTCDate() - diff);
  return sunday.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Next Sunday, or today if today is Sunday — used by admin */
export function getUpcomingSunday(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 0 : 7 - day;
  const sunday = new Date(now);
  sunday.setUTCDate(now.getUTCDate() + diff);
  return sunday.toISOString().slice(0, 10);
}

export type PickWithProduct = {
  pickId: number;
  weekStart: string;
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
}

export async function getPicksForWeek(weekStart: string): Promise<PickWithProduct[]> {
  const sql = neon(getDatabaseUrl());
  await initEditorsPicks();

  const rows = await sql`
    SELECT
      ep.id AS pick_id,
      ep.week_start,
      ep.position,
      p.id AS product_id,
      p.store_slug,
      p.store_name,
      p.title,
      p.price,
      p.image,
      p.images,
      p.size,
      p.external_url
    FROM editors_picks ep
    JOIN products p ON p.id = ep.product_id
    WHERE ep.week_start = ${weekStart}
    ORDER BY ep.position ASC
  `;

  return rows.map((r) => ({
    pickId: r.pick_id as number,
    weekStart: typeof r.week_start === "object" && r.week_start !== null
      ? (r.week_start as Date).toISOString().slice(0, 10)
      : String(r.week_start).slice(0, 10),
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

export async function getCurrentEditorsPicks(): Promise<PickWithProduct[]> {
  return getPicksForWeek(getCurrentSunday());
}

export async function getUpcomingEditorsPicks(): Promise<PickWithProduct[]> {
  return getPicksForWeek(getUpcomingSunday());
}

export async function addEditorsPick(productId: number): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await initEditorsPicks();

  const weekStart = getUpcomingSunday();

  const countRows = await sql`
    SELECT COUNT(*)::int AS cnt FROM editors_picks WHERE week_start = ${weekStart}
  `;
  const count = countRows[0].cnt as number;
  if (count >= 20) {
    throw new Error("Maximum of 20 picks allowed per week");
  }

  await sql`
    INSERT INTO editors_picks (product_id, week_start, position)
    VALUES (${productId}, ${weekStart}, ${count})
    ON CONFLICT (product_id, week_start) DO NOTHING
  `;
}

export async function removeEditorsPick(productId: number, weekStart: string): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await initEditorsPicks();
  await sql`
    DELETE FROM editors_picks WHERE product_id = ${productId} AND week_start = ${weekStart}
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

/** Browse all products for a store (no search query needed) */
export async function getProductsByStore(storeSlug: string, limit = 200): Promise<ProductResult[]> {
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
        LIMIT 30
      `
    : await sql`
        SELECT id, store_slug, store_name, title, price, image
        FROM products
        WHERE title ILIKE ${"%" + q + "%"}
        ORDER BY title
        LIMIT 30
      `;

  return rows.map(mapProductRow);
}
