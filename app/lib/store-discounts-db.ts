import { neon } from "@neondatabase/serverless";

// Per-store discount codes. A store can keep many (to feature in campaigns / on the
// store page), but only ONE can be the click-through auto-apply (Shopify applies one
// code), enforced by clearing the others when one is set. The code is the seller's
// real store code; kind/value are for display + the seller's own reference.

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is not set.");
 return neon(url);
}

let ensured = false;
async function ensureTable() {
 if (ensured) return;
 await db()`CREATE TABLE IF NOT EXISTS store_discounts (
 id SERIAL PRIMARY KEY,
 store_slug TEXT NOT NULL,
 code TEXT NOT NULL,
 label TEXT,
 kind TEXT NOT NULL DEFAULT 'percent',
 value NUMERIC,
 active BOOLEAN NOT NULL DEFAULT true,
 auto_apply BOOLEAN NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
 )`;
 await db()`CREATE INDEX IF NOT EXISTS idx_store_discounts_store ON store_discounts(store_slug)`;
 ensured = true;
}

export type Discount = { id: number; code: string; label: string | null; kind: string; value: number | null; active: boolean; autoApply: boolean };

type Row = { id: number; code: string; label: string | null; kind: string; value: number | null; active: boolean; auto_apply: boolean };
const map = (r: Row): Discount => ({ id: Number(r.id), code: r.code, label: r.label, kind: r.kind, value: r.value == null ? null : Number(r.value), active: !!r.active, autoApply: !!r.auto_apply });

export async function listDiscounts(storeSlug: string): Promise<Discount[]> {
 await ensureTable();
 const rows = await db()`SELECT id, code, label, kind, value, active, auto_apply FROM store_discounts WHERE store_slug = ${storeSlug} ORDER BY created_at DESC`;
 return (rows as Row[]).map(map);
}

export async function addDiscount(storeSlug: string, d: { code: string; label?: string; kind?: string; value?: number | null }): Promise<Discount | null> {
 await ensureTable();
 const code = (d.code || "").trim().toUpperCase().slice(0, 64);
 if (!code) return null;
 const kind = ["percent", "fixed", "free_shipping", "other"].includes(d.kind || "") ? d.kind! : "percent";
 const value = d.value == null || Number.isNaN(Number(d.value)) ? null : Number(d.value);
 // First discount for the store becomes the auto-apply by default.
 const existing = await db()`SELECT COUNT(*)::int AS n FROM store_discounts WHERE store_slug = ${storeSlug}`;
 const isFirst = Number((existing[0] as { n: number }).n) === 0;
 const rows = await db()`INSERT INTO store_discounts (store_slug, code, label, kind, value, auto_apply)
 VALUES (${storeSlug}, ${code}, ${d.label?.trim() || null}, ${kind}, ${value}, ${isFirst})
 RETURNING id, code, label, kind, value, active, auto_apply`;
 return map(rows[0] as Row);
}

export async function updateDiscount(storeSlug: string, id: number, patch: { active?: boolean; autoApply?: boolean }): Promise<void> {
 await ensureTable();
 if (patch.autoApply === true) {
 // only one auto-apply per store
 await db()`UPDATE store_discounts SET auto_apply = false WHERE store_slug = ${storeSlug}`;
 await db()`UPDATE store_discounts SET auto_apply = true, active = true WHERE store_slug = ${storeSlug} AND id = ${id}`;
 return;
 }
 if (patch.autoApply === false) {
 await db()`UPDATE store_discounts SET auto_apply = false WHERE store_slug = ${storeSlug} AND id = ${id}`;
 }
 if (typeof patch.active === "boolean") {
 await db()`UPDATE store_discounts SET active = ${patch.active}, auto_apply = (auto_apply AND ${patch.active}) WHERE store_slug = ${storeSlug} AND id = ${id}`;
 }
}

export async function deleteDiscount(storeSlug: string, id: number): Promise<void> {
 await ensureTable();
 await db()`DELETE FROM store_discounts WHERE store_slug = ${storeSlug} AND id = ${id}`;
}

/** The active auto-apply code for click-through (or null). Used by /api/track. */
export async function getAutoApplyCode(storeSlug: string): Promise<string | null> {
 await ensureTable();
 const rows = await db()`SELECT code FROM store_discounts WHERE store_slug = ${storeSlug} AND active = true AND auto_apply = true LIMIT 1`;
 const v = rows[0] ? (rows[0] as { code: string }).code : null;
 return v && v.trim() ? v.trim() : null;
}
