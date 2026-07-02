import { neon } from "@neondatabase/serverless";
import { cosine } from "./embeddings";

// The intake "correction memory" — v1 of the learning loop.
//
// Every time a seller fixes a field the AI drafted (e.g. brand "Roberto Cavalli"
// → "Blumarine"), we log it. On the next intake we feed the store's recent brand
// corrections + the brands they actually deal in back into the model as hints, so
// it stops repeating the same misses. The same table is the substrate for the v2
// visual-retrieval layer (it already stores the photo URL per correction).

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is not set.");
 return neon(url);
}

let ensured = false;
async function ensureTable() {
 if (ensured) return;
 await db()`
  CREATE TABLE IF NOT EXISTS intake_corrections (
   id SERIAL PRIMARY KEY,
   store_slug TEXT NOT NULL,
   field TEXT NOT NULL,
   ai_value TEXT,
   final_value TEXT NOT NULL,
   image_url TEXT,
   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
 `;
 await db()`CREATE INDEX IF NOT EXISTS idx_intake_corr_store ON intake_corrections (store_slug, created_at DESC)`;
 ensured = true;
}

export type Correction = { field: string; aiValue: string | null; finalValue: string; imageUrl?: string | null };

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

/**
 * Log the fields a seller changed from what the AI drafted. Only real changes are
 * kept (final differs from the AI's guess, case-insensitively) and only fields with
 * a meaningful final value.
 */
export async function logCorrections(storeSlug: string, corrections: Correction[]): Promise<void> {
 const real = corrections.filter((c) => c.finalValue && c.finalValue.trim() && norm(c.aiValue) !== norm(c.finalValue));
 if (real.length === 0) return;
 await ensureTable();
 const sql = db();
 for (const c of real) {
  await sql`
   INSERT INTO intake_corrections (store_slug, field, ai_value, final_value, image_url)
   VALUES (${storeSlug}, ${c.field}, ${c.aiValue ?? null}, ${c.finalValue.trim().slice(0, 200)}, ${c.imageUrl ?? null})
  `.catch(() => {});
 }
}

// ── Prediction log: every AI-proposed field + whether the seller kept it (accepted)
// or changed it (corrected). This is the acceptance flow — the denominator the
// correction log never had. Powers true per-field accuracy + the eval dataset.
let predEnsured = false;
async function ensurePredictionsTable() {
 if (predEnsured) return;
 await db()`
  CREATE TABLE IF NOT EXISTS intake_predictions (
   id SERIAL PRIMARY KEY,
   store_slug TEXT NOT NULL,
   field TEXT NOT NULL,
   ai_value TEXT,
   final_value TEXT,
   accepted BOOLEAN NOT NULL DEFAULT false,
   image_url TEXT,
   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
 `;
 await db()`CREATE INDEX IF NOT EXISTS idx_intake_pred_field ON intake_predictions (field, created_at DESC)`;
 predEnsured = true;
}

export type PredictionInput = { field: string; aiValue: string | null; finalValue: string; imageUrl?: string | null };

/**
 * Log every field the AI actually PREDICTED (non-empty guess), with whether the
 * seller kept it (accepted) or changed it. Fields the seller pre-typed carry no AI
 * prediction and must arrive with a null aiValue → they're skipped, so accuracy
 * measures the model, not the seller doing its job.
 */
export async function logPredictions(storeSlug: string, preds: PredictionInput[]): Promise<void> {
 const real = preds.filter((p) => p.aiValue && p.aiValue.trim());
 if (real.length === 0) return;
 await ensurePredictionsTable();
 const sql = db();
 for (const p of real) {
  const accepted = !!p.finalValue.trim() && norm(p.aiValue) === norm(p.finalValue);
  await sql`
   INSERT INTO intake_predictions (store_slug, field, ai_value, final_value, accepted, image_url)
   VALUES (${storeSlug}, ${p.field}, ${p.aiValue}, ${p.finalValue.trim().slice(0, 200)}, ${accepted}, ${p.imageUrl ?? null})
  `.catch(() => {});
 }
}

/**
 * Build a compact, prompt-ready hint block from this store's correction history:
 *  • the brands they actually deal in (bias the model toward these), and
 *  • recent wrong→right brand fixes (don't repeat these mistakes).
 * Returns "" when there's no history yet, so early listings just use base Claude.
 */
export async function getIntakeHints(storeSlug: string): Promise<string> {
 await ensureTable();
 const sql = db();

 const brandFixes = (await sql`
  SELECT DISTINCT ON (lower(ai_value), lower(final_value)) ai_value, final_value
  FROM intake_corrections
  WHERE store_slug = ${storeSlug} AND field = 'brand' AND ai_value IS NOT NULL AND ai_value <> ''
  ORDER BY lower(ai_value), lower(final_value), created_at DESC
  LIMIT 20
 `.catch(() => [])) as { ai_value: string; final_value: string }[];

 const topBrands = (await sql`
  SELECT final_value AS brand, COUNT(*)::int AS n
  FROM intake_corrections
  WHERE store_slug = ${storeSlug} AND field = 'brand' AND final_value <> ''
  GROUP BY final_value ORDER BY n DESC LIMIT 12
 `.catch(() => [])) as { brand: string; n: number }[];

 const parts: string[] = [];
 if (topBrands.length) {
  parts.push(`Brands this seller commonly lists: ${topBrands.map((b) => b.brand).join(", ")}. Favor these when the visual evidence is ambiguous.`);
 }
 if (brandFixes.length) {
  parts.push(
   "Past brand corrections by this seller (the AI guessed the first, the seller's correct answer is the second — do NOT repeat these mistakes):\n" +
    brandFixes.map((f) => `• "${f.ai_value}" → "${f.final_value}"`).join("\n"),
  );
 }
 if (parts.length === 0) return "";
 return `\n\nSELLER MEMORY — this store has corrected the AI before; use it:\n${parts.join("\n")}`;
}

// ──────────────────────────────────────────────────────────────────────────
// v2: per-store memory. Every published item records its photo embedding + final
// labels (a visual corpus matched against new uploads) AND the comp market value
// vs. the seller's final price (so we learn how this store prices vs. the market).

let itemsEnsured = false;
async function ensureItemsTable() {
 if (itemsEnsured) return;
 await db()`
  CREATE TABLE IF NOT EXISTS intake_memory_items (
   id SERIAL PRIMARY KEY,
   store_slug TEXT NOT NULL,
   image_url TEXT,
   embedding TEXT NOT NULL,
   brand TEXT, era TEXT, material TEXT, condition TEXT, category TEXT,
   market_cents INTEGER, price_cents INTEGER,
   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
 `;
 await db()`ALTER TABLE intake_memory_items ADD COLUMN IF NOT EXISTS market_cents INTEGER`;
 await db()`ALTER TABLE intake_memory_items ADD COLUMN IF NOT EXISTS price_cents INTEGER`;
 await db()`CREATE INDEX IF NOT EXISTS idx_intake_mem_store ON intake_memory_items (store_slug, created_at DESC)`;
 itemsEnsured = true;
}

export type MemoryItem = {
 imageUrl: string | null;
 embedding: number[];
 brand?: string | null; era?: string | null; material?: string | null; condition?: string | null; category?: string | null;
 marketCents?: number | null; // comp market value at intake (raw, before store adjustment)
 priceCents?: number | null;  // the seller's final list price
};

/**
 * Store a published item: photo embedding + labels (visual memory) AND the comp
 * market value vs. the final price (pricing memory). Recorded even without an
 * embedding, so pricing still learns when image embeddings are disabled.
 */
export async function rememberItem(storeSlug: string, item: MemoryItem): Promise<void> {
 await ensureItemsTable();
 await db()`
  INSERT INTO intake_memory_items (store_slug, image_url, embedding, brand, era, material, condition, category, market_cents, price_cents)
  VALUES (${storeSlug}, ${item.imageUrl ?? null}, ${JSON.stringify(item.embedding ?? [])},
   ${item.brand ?? null}, ${item.era ?? null}, ${item.material ?? null}, ${item.condition ?? null}, ${item.category ?? null},
   ${item.marketCents ?? null}, ${item.priceCents ?? null})
 `.catch(() => {});
}

/**
 * Given a new photo's embedding, pull the most visually-similar past pieces from
 * this store's own catalog and return a prompt hint block. Empty until the store
 * has a corpus. Pilot-scale: scans recent items in JS (cosine); pgvector later.
 */
export async function getVisualHints(storeSlug: string, embedding: number[]): Promise<string> {
 if (!embedding || embedding.length === 0) return "";
 await ensureItemsTable();
 const rows = (await db()`
  SELECT image_url, embedding, brand, era, material, category
  FROM intake_memory_items WHERE store_slug = ${storeSlug}
  ORDER BY created_at DESC LIMIT 400
 `.catch(() => [])) as { embedding: string; brand: string | null; era: string | null; material: string | null; category: string | null }[];

 const scored = rows
  .map((r) => {
  let v: number[] = [];
  try { v = JSON.parse(r.embedding); } catch { /* skip malformed */ }
  return { r, score: v.length ? cosine(embedding, v) : 0 };
  })
  .filter((s) => s.score >= 0.6) // tune as we see real match scores
  .sort((a, b) => b.score - a.score)
  .slice(0, 4);

 if (scored.length === 0) return "";
 const lines = scored.map((s) => {
  const bits = [s.r.brand && `brand: ${s.r.brand}`, s.r.era, s.r.material, s.r.category].filter(Boolean).join(" · ");
  return `• a visually similar piece this seller listed → ${bits || "(no labels)"}`;
 });
 return `\n\nVISUALLY SIMILAR PAST LISTINGS (this seller's own catalog — strong signal; weight heavily for brand/era/material):\n${lines.join("\n")}`;
}

/**
 * How this store prices relative to market comps — the median of (final price ÷
 * comp market value) across past listings. >1 means they price ABOVE market
 * (premium positioning), <1 below. Defaults to 1 until there's enough history,
 * and is clamped so a few outliers can't blow up suggestions.
 */
export async function getStorePriceMultiplier(storeSlug: string): Promise<number> {
 await ensureItemsTable();
 const rows = (await db()`
  SELECT price_cents::float / market_cents AS ratio
  FROM intake_memory_items
  WHERE store_slug = ${storeSlug} AND market_cents > 0 AND price_cents > 0
  ORDER BY created_at DESC LIMIT 100
 `.catch(() => [])) as { ratio: number }[];
 const ratios = rows.map((r) => Number(r.ratio)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
 if (ratios.length < 3) return 1; // not enough signal yet — trust the comps as-is
 const mid = Math.floor(ratios.length / 2);
 const median = ratios.length % 2 ? ratios[mid] : (ratios[mid - 1] + ratios[mid]) / 2;
 return Math.min(2.5, Math.max(0.6, median)); // clamp to a sane band
}
