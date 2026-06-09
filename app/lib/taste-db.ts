import { neon } from "@neondatabase/serverless";
import { sanitizeVibes } from "./tasteVibes";

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("No database URL");
 return neon(url);
}

let ensured = false;
async function ensureTable() {
 if (ensured) return;
 const sql = db();
 await sql`
 CREATE TABLE IF NOT EXISTS user_taste (
  user_id UUID PRIMARY KEY,
  vibes JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )
 `;
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

/** Upserts the user's vibe selections (validated against the known set). */
export async function setUserTaste(userId: string, vibesInput: unknown): Promise<string[]> {
 await ensureTable();
 const sql = db();
 const vibes = sanitizeVibes(vibesInput);
 await sql`
 INSERT INTO user_taste (user_id, vibes, updated_at)
 VALUES (${userId}, ${JSON.stringify(vibes)}::jsonb, NOW())
 ON CONFLICT (user_id) DO UPDATE SET vibes = EXCLUDED.vibes, updated_at = NOW()
 `;
 return vibes;
}
