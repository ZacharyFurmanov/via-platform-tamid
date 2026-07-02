import { neon } from "@neondatabase/serverless";

// The VYA training dataset — one clean, append-only "golden record" per example, so
// that when we're ready to train our own model it starts from pristine data, not a
// mess we have to reconstruct. Two sources feed it:
//   • 'intake'      — new AI-assisted listings: photo + the AI's guess + the seller's
//                     final answer + which fields were accepted (the richest signal).
//   • 'items' /     — everything ALREADY on the platform (VYA inventory + marketplace
//     'marketplace'   products): photo → human-written brand/era/price/title. A
//                     finished listing IS a labeled example.
// Stable UNIQUE(source, item_ref) makes both capture and backfill idempotent.

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is not set.");
 return neon(url);
}

let ensured = false;
async function ensureTable() {
 if (ensured) return;
 const sql = db();
 await sql`
  CREATE TABLE IF NOT EXISTS training_examples (
   id SERIAL PRIMARY KEY,
   source TEXT NOT NULL,
   store_slug TEXT,
   item_ref TEXT NOT NULL,
   image_urls JSONB NOT NULL DEFAULT '[]',
   brand TEXT, era TEXT, material TEXT, condition TEXT, category TEXT, size TEXT,
   title TEXT, description TEXT,
   price_cents INTEGER, market_cents INTEGER,
   ai_brand TEXT, ai_era TEXT, ai_material TEXT, ai_condition TEXT, ai_category TEXT,
   ai_title TEXT, ai_description TEXT, ai_runway TEXT,
   accepted JSONB,
   reverse_image JSONB,
   prompt_version TEXT,
   trust TEXT,
   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
   UNIQUE (source, item_ref)
  )
 `;
 await sql`CREATE INDEX IF NOT EXISTS idx_training_source ON training_examples (source, created_at DESC)`;
 ensured = true;
}

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
const clean = (v: string | null | undefined, n = 300) => { const s = (v ?? "").trim(); return s ? s.slice(0, n) : null; };

export type IntakeExample = {
 itemId: string;
 storeSlug: string;
 imageUrls: string[];
 final: Partial<Record<"brand" | "era" | "material" | "condition" | "category" | "size" | "title" | "description", string | null>>;
 priceCents: number | null;
 marketCents: number | null;
 ai: Partial<Record<"brand" | "era" | "material" | "condition" | "category" | "title" | "description" | "runway", string | null>>;
 reverseImage?: unknown;
 promptVersion?: string | null;
 trust: string;
};

const AI_FIELDS = ["brand", "era", "material", "condition", "category", "title", "description"] as const;

/** Record one AI-assisted listing as a golden training example (upsert on republish). */
export async function recordIntakeExample(x: IntakeExample): Promise<void> {
 await ensureTable();
 // Which AI predictions the seller kept vs. changed — the label quality signal.
 const accepted: Record<string, boolean> = {};
 for (const f of AI_FIELDS) {
 const aiv = x.ai[f];
 if (aiv && aiv.trim()) accepted[f] = norm(aiv) === norm(x.final[f as keyof typeof x.final]);
 }
 const f = x.final, ai = x.ai;
 await db()`
  INSERT INTO training_examples
   (source, store_slug, item_ref, image_urls, brand, era, material, condition, category, size, title, description,
    price_cents, market_cents, ai_brand, ai_era, ai_material, ai_condition, ai_category, ai_title, ai_description, ai_runway,
    accepted, reverse_image, prompt_version, trust)
  VALUES ('intake', ${x.storeSlug}, ${x.itemId}, ${JSON.stringify(x.imageUrls ?? [])},
   ${clean(f.brand, 80)}, ${clean(f.era, 40)}, ${clean(f.material, 120)}, ${clean(f.condition, 80)}, ${clean(f.category, 60)}, ${clean(f.size, 40)},
   ${clean(f.title, 200)}, ${clean(f.description, 2000)},
   ${x.priceCents ?? null}, ${x.marketCents ?? null},
   ${clean(ai.brand, 80)}, ${clean(ai.era, 40)}, ${clean(ai.material, 120)}, ${clean(ai.condition, 80)}, ${clean(ai.category, 60)},
   ${clean(ai.title, 200)}, ${clean(ai.description, 2000)}, ${clean(ai.runway, 120)},
   ${JSON.stringify(accepted)}, ${x.reverseImage ? JSON.stringify(x.reverseImage) : null}, ${x.promptVersion ?? null}, ${x.trust})
  ON CONFLICT (source, item_ref) DO UPDATE SET
   image_urls = EXCLUDED.image_urls, brand = EXCLUDED.brand, era = EXCLUDED.era, material = EXCLUDED.material,
   condition = EXCLUDED.condition, category = EXCLUDED.category, size = EXCLUDED.size, title = EXCLUDED.title,
   description = EXCLUDED.description, price_cents = EXCLUDED.price_cents, accepted = EXCLUDED.accepted, trust = EXCLUDED.trust
 `.catch(() => {});
}

/** Backfill every VYA-native inventory item (rich human labels) into the dataset. */
export async function backfillFromItems(): Promise<number> {
 await ensureTable();
 const rows = (await db()`
  WITH ins AS (
   INSERT INTO training_examples (source, store_slug, item_ref, image_urls, brand, era, material, condition, category, size, title, price_cents, trust)
   SELECT 'items', s.slug, i.id::text, i.images, i.brand, i.era, i.material, i.condition, i.category, i.size, i.title, i.price_cents, 'high'
   FROM items i JOIN sellers s ON s.id = i.seller_id
   WHERE jsonb_array_length(i.images) > 0 AND i.title IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM training_examples te WHERE te.source = 'intake' AND te.item_ref = i.id::text)
   ON CONFLICT (source, item_ref) DO NOTHING
   RETURNING 1
  ) SELECT count(*)::int AS n FROM ins
 `.catch(() => [{ n: 0 }])) as { n: number }[];
 return rows[0]?.n ?? 0;
}

/** Backfill every marketplace product (photo → seller-written title/brand/price). */
export async function backfillFromProducts(): Promise<number> {
 await ensureTable();
 const rows = (await db()`
  WITH ins AS (
   INSERT INTO training_examples (source, store_slug, item_ref, image_urls, brand, title, description, size, price_cents, trust)
   SELECT 'marketplace', p.store_slug, p.id::text,
    jsonb_build_array(p.image), p.brand, p.title, p.description, p.size,
    CASE WHEN p.price IS NOT NULL THEN round(p.price * 100)::int ELSE NULL END, 'medium'
   FROM products p
   WHERE p.image IS NOT NULL AND p.image <> '' AND p.title IS NOT NULL
   ON CONFLICT (source, item_ref) DO NOTHING
   RETURNING 1
  ) SELECT count(*)::int AS n FROM ins
 `.catch(() => [{ n: 0 }])) as { n: number }[];
 return rows[0]?.n ?? 0;
}

export type TrainingStats = {
 total: number;
 bySource: { source: string; count: number; withBrand: number; withPrice: number; withImage: number }[];
};

export async function getTrainingStats(): Promise<TrainingStats> {
 await ensureTable();
 const rows = (await db()`
  SELECT source, COUNT(*)::int AS count,
   COUNT(*) FILTER (WHERE brand IS NOT NULL AND brand <> '')::int AS with_brand,
   COUNT(*) FILTER (WHERE price_cents > 0)::int AS with_price,
   COUNT(*) FILTER (WHERE jsonb_array_length(image_urls) > 0)::int AS with_image
  FROM training_examples GROUP BY source ORDER BY count DESC
 `.catch(() => [])) as { source: string; count: number; with_brand: number; with_price: number; with_image: number }[];
 const bySource = rows.map((r) => ({ source: r.source, count: Number(r.count), withBrand: Number(r.with_brand), withPrice: Number(r.with_price), withImage: Number(r.with_image) }));
 return { total: bySource.reduce((s, r) => s + r.count, 0), bySource };
}
