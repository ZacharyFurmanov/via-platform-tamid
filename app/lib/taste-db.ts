import { neon } from "@neondatabase/serverless";
import { sanitizeVibes, sanitizeSizes } from "./tasteVibes";

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("No database URL");
 return neon(url);
}

export type TasteProfile = { vibes: string[]; sizes: string[] };

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
 // Add sizes column for tables created before sizes existed (safe migration).
 await sql`ALTER TABLE user_taste ADD COLUMN IF NOT EXISTS sizes JSONB NOT NULL DEFAULT '[]'::jsonb`;
 ensured = true;
}

/** Returns the user's saved vibe keys (empty array if none / not taken yet). */
export async function getUserTaste(userId: string): Promise<string[]> {
 await ensureTable();
 const sql = db();
 const rows = (await sql`SELECT vibes FROM user_taste WHERE user_id = ${userId} LIMIT 1`) as Array<{ vibes: unknown }>;
 if (rows.length === 0) return [];
 return sanitizeVibes(rows[0].vibes);
}

/** Returns the full taste profile (vibes + sizes). */
export async function getUserTasteProfile(userId: string): Promise<TasteProfile> {
 await ensureTable();
 const sql = db();
 const rows = (await sql`SELECT vibes, sizes FROM user_taste WHERE user_id = ${userId} LIMIT 1`) as Array<{ vibes: unknown; sizes: unknown }>;
 if (rows.length === 0) return { vibes: [], sizes: [] };
 return { vibes: sanitizeVibes(rows[0].vibes), sizes: sanitizeSizes(rows[0].sizes) };
}

/** Upserts the user's vibe + size selections (both validated). */
export async function setUserTasteProfile(userId: string, input: { vibes?: unknown; sizes?: unknown }): Promise<TasteProfile> {
 await ensureTable();
 const sql = db();
 const vibes = sanitizeVibes(input.vibes);
 const sizes = sanitizeSizes(input.sizes);
 await sql`
 INSERT INTO user_taste (user_id, vibes, sizes, updated_at)
 VALUES (${userId}, ${JSON.stringify(vibes)}::jsonb, ${JSON.stringify(sizes)}::jsonb, NOW())
 ON CONFLICT (user_id) DO UPDATE SET vibes = EXCLUDED.vibes, sizes = EXCLUDED.sizes, updated_at = NOW()
 `;
 return { vibes, sizes };
}
