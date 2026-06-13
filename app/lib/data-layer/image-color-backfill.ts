import { neon } from "@neondatabase/serverless";
import { identifyColor } from "./vision";
import { normalizeColor } from "../colorNormalize";

// ───────────────────────────────────────────────────────────────────────────
// Read the dominant colour off product images (vision) and store it normalized
// to the filter palette, so colour filtering works for items whose TITLE has no
// colour word. Incremental: only unprocessed products (image_color_at IS NULL);
// failures stay unprocessed and are retried next run. Shared by the admin
// backfill endpoint and the daily cron.
// ───────────────────────────────────────────────────────────────────────────

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("No database URL");
 return neon(url);
}

export type BackfillResult = { processed: number; colored: number; failed: number; remaining: number };

export async function backfillImageColors(limit: number): Promise<BackfillResult> {
 const sql = db();
 // Safe on first run — columns may not exist yet.
 await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_color TEXT`;
 await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_color_at TIMESTAMPTZ`;

 const rows = (await sql`
 SELECT id, image FROM products
 WHERE image_color_at IS NULL
  AND image IS NOT NULL AND image <> '' AND image NOT ILIKE '%placeholder%'
 ORDER BY id DESC
 LIMIT ${limit}
 `) as Array<{ id: number; image: string }>;

 let processed = 0;
 let colored = 0;
 let failed = 0;
 // Small concurrent chunks — well within Anthropic rate limits, much faster than serial.
 const CONCURRENCY = 5;
 for (let i = 0; i < rows.length; i += CONCURRENCY) {
 const chunk = rows.slice(i, i + CONCURRENCY);
 const results = await Promise.allSettled(
 chunk.map(async (r) => {
  const raw = await identifyColor(r.image);
  const color = normalizeColor(raw);
  await sql`UPDATE products SET image_color = ${color}, image_color_at = NOW() WHERE id = ${r.id}`;
  return color;
 }),
 );
 for (const res of results) {
 if (res.status === "fulfilled") {
  processed++;
  if (res.value) colored++;
 } else {
  failed++;
  console.error("[image-color-backfill] failed:", res.reason);
 }
 }
 }

 const [{ remaining }] = (await sql`
 SELECT COUNT(*)::int AS remaining FROM products
 WHERE image_color_at IS NULL AND image IS NOT NULL AND image <> ''
 `) as Array<{ remaining: number }>;

 return { processed, colored, failed, remaining };
}
