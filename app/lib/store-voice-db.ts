import { neon } from "@neondatabase/serverless";

// Each store's learned writing voice — distilled from how they already write their
// listings — plus a few real example descriptions. The AI listing writer pulls this
// so new drafts sound like THIS store, not generic AI. Refreshable as they add more
// listings (the agent keeps learning).

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is not set.");
 return neon(url);
}

let ensured = false;
async function ensureTable() {
 if (ensured) return;
 await db()`CREATE TABLE IF NOT EXISTS store_voice (
 store_slug TEXT PRIMARY KEY,
 guide TEXT NOT NULL,
 examples TEXT[] NOT NULL DEFAULT '{}',
 sample_size INTEGER NOT NULL DEFAULT 0,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
 )`;
 ensured = true;
}

export type StoreVoice = { guide: string; examples: string[]; sampleSize: number };

export async function saveVoice(storeSlug: string, guide: string, examples: string[], sampleSize: number): Promise<void> {
 await ensureTable();
 await db()`INSERT INTO store_voice (store_slug, guide, examples, sample_size, updated_at)
 VALUES (${storeSlug}, ${guide}, ${examples}, ${sampleSize}, now())
 ON CONFLICT (store_slug) DO UPDATE SET guide = ${guide}, examples = ${examples}, sample_size = ${sampleSize}, updated_at = now()`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getVoice(storeSlug: string): Promise<StoreVoice | null> {
 await ensureTable();
 const rows = await db()`SELECT guide, examples, sample_size FROM store_voice WHERE store_slug = ${storeSlug}`;
 if (!rows.length) return null;
 const r: any = rows[0];
 return { guide: r.guide, examples: Array.isArray(r.examples) ? r.examples : [], sampleSize: r.sample_size };
}
