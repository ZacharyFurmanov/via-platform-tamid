import { neon } from "@neondatabase/serverless";
import { sanitizeVibes, sanitizeSizes, sanitizeColors, sanitizeEras, sanitizeCategories } from "./tasteVibes";

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("No database URL");
 return neon(url);
}

export type TasteProfile = {
 vibes: string[];
 sizes: string[];
 categories: string[];
 designers: string[];
 colors: string[];
 eras: string[];
};

const EMPTY: TasteProfile = { vibes: [], sizes: [], categories: [], designers: [], colors: [], eras: [] };

// Designers are brand slugs; the route validates them against the catalog before
// saving, so here we just keep them as clean lowercase strings (capped).
function sanitizeDesigners(input: unknown): string[] {
 if (!Array.isArray(input)) return [];
 const out: string[] = [];
 for (const s of input) {
 if (typeof s !== "string") continue;
 const v = s.trim().toLowerCase();
 if (v && !out.includes(v)) out.push(v);
 if (out.length >= 20) break;
 }
 return out;
}

let ensured = false;
async function ensureTable() {
 if (ensured) return;
 const sql = db();
 await sql`
 CREATE TABLE IF NOT EXISTS user_taste (
  user_id UUID PRIMARY KEY,
  vibes JSONB NOT NULL DEFAULT '[]'::jsonb,
  sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )
 `;
 // Safe migrations for the richer taste profile.
 await sql`ALTER TABLE user_taste ADD COLUMN IF NOT EXISTS sizes JSONB NOT NULL DEFAULT '[]'::jsonb`;
 await sql`ALTER TABLE user_taste ADD COLUMN IF NOT EXISTS categories JSONB NOT NULL DEFAULT '[]'::jsonb`;
 await sql`ALTER TABLE user_taste ADD COLUMN IF NOT EXISTS designers JSONB NOT NULL DEFAULT '[]'::jsonb`;
 await sql`ALTER TABLE user_taste ADD COLUMN IF NOT EXISTS colors JSONB NOT NULL DEFAULT '[]'::jsonb`;
 await sql`ALTER TABLE user_taste ADD COLUMN IF NOT EXISTS eras JSONB NOT NULL DEFAULT '[]'::jsonb`;
 ensured = true;
}

/** Returns the user's saved vibe keys (kept for callers that only need vibes). */
export async function getUserTaste(userId: string): Promise<string[]> {
 return (await getUserTasteProfile(userId)).vibes;
}

/** The full taste profile (all dimensions), empty arrays if not taken yet. */
export async function getUserTasteProfile(userId: string): Promise<TasteProfile> {
 await ensureTable();
 const sql = db();
 const rows = (await sql`SELECT vibes, sizes, categories, designers, colors, eras FROM user_taste WHERE user_id = ${userId} LIMIT 1`) as Array<Record<string, unknown>>;
 if (rows.length === 0) return EMPTY;
 const r = rows[0];
 return {
 vibes: sanitizeVibes(r.vibes),
 sizes: sanitizeSizes(r.sizes),
 categories: sanitizeCategories(r.categories),
 designers: sanitizeDesigners(r.designers),
 colors: sanitizeColors(r.colors),
 eras: sanitizeEras(r.eras),
 };
}

/** Upserts the user's taste selections. Only the fields present in `input` are
 * written; omitted fields keep their existing value. `validDesigners` (from the
 * route) restricts designers to real catalog brands. */
export async function setUserTasteProfile(
 userId: string,
 input: { vibes?: unknown; sizes?: unknown; categories?: unknown; designers?: unknown; colors?: unknown; eras?: unknown },
 validDesigners?: Set<string>,
): Promise<TasteProfile> {
 await ensureTable();
 const sql = db();
 const current = await getUserTasteProfile(userId);

 const next: TasteProfile = {
 vibes: input.vibes !== undefined ? sanitizeVibes(input.vibes) : current.vibes,
 sizes: input.sizes !== undefined ? sanitizeSizes(input.sizes) : current.sizes,
 categories: input.categories !== undefined ? sanitizeCategories(input.categories) : current.categories,
 designers: input.designers !== undefined ? sanitizeDesigners(input.designers).filter((d) => !validDesigners || validDesigners.has(d)) : current.designers,
 colors: input.colors !== undefined ? sanitizeColors(input.colors) : current.colors,
 eras: input.eras !== undefined ? sanitizeEras(input.eras) : current.eras,
 };

 await sql`
 INSERT INTO user_taste (user_id, vibes, sizes, categories, designers, colors, eras, updated_at)
 VALUES (${userId}, ${JSON.stringify(next.vibes)}::jsonb, ${JSON.stringify(next.sizes)}::jsonb, ${JSON.stringify(next.categories)}::jsonb, ${JSON.stringify(next.designers)}::jsonb, ${JSON.stringify(next.colors)}::jsonb, ${JSON.stringify(next.eras)}::jsonb, NOW())
 ON CONFLICT (user_id) DO UPDATE SET vibes = EXCLUDED.vibes, sizes = EXCLUDED.sizes, categories = EXCLUDED.categories, designers = EXCLUDED.designers, colors = EXCLUDED.colors, eras = EXCLUDED.eras, updated_at = NOW()
 `;
 return next;
}
