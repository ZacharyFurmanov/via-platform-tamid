import { neon } from "@neondatabase/serverless";

// Lightweight cart tracking for the recommerce checkout: we log when a buyer opens a
// Stripe checkout for a one-of-one piece. If they don't complete it, the abandoned-cart
// automation nudges them; if they buy (or the piece sells), the attempt is recovered.

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is not set.");
 return neon(url);
}

let ensured = false;
async function ensureTable() {
 if (ensured) return;
 await db()`
  CREATE TABLE IF NOT EXISTS checkout_attempts (
   id SERIAL PRIMARY KEY,
   store_slug TEXT NOT NULL,
   email TEXT NOT NULL,
   name TEXT,
   item_id TEXT NOT NULL,
   item_title TEXT,
   item_image TEXT,
   status TEXT NOT NULL DEFAULT 'pending',
   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
   emailed_at TIMESTAMPTZ
  )
 `;
 await db()`CREATE INDEX IF NOT EXISTS idx_checkout_attempts_status ON checkout_attempts (status, created_at)`;
 ensured = true;
}

export async function recordCheckoutAttempt(a: { storeSlug: string; email: string; name?: string | null; itemId: string; itemTitle?: string | null; itemImage?: string | null }): Promise<void> {
 if (!a.email || !a.email.includes("@")) return;
 await ensureTable();
 await db()`
  INSERT INTO checkout_attempts (store_slug, email, name, item_id, item_title, item_image)
  VALUES (${a.storeSlug}, ${a.email.trim().toLowerCase()}, ${a.name ?? null}, ${a.itemId}, ${a.itemTitle ?? null}, ${a.itemImage ?? null})
 `.catch(() => {});
}

/** A piece sold (or the buyer completed) — no more nudging for it. */
export async function markCheckoutRecovered(itemId: string): Promise<void> {
 await ensureTable();
 await db()`UPDATE checkout_attempts SET status = 'recovered' WHERE item_id = ${itemId} AND status IN ('pending', 'emailed')`.catch(() => {});
}

export type AbandonedCart = { id: number; storeSlug: string; email: string; name: string | null; itemId: string; itemTitle: string | null; itemImage: string | null };

/** Pending checkouts older than `minAgeMinutes` (and newer than 3 days) — to nudge. */
export async function getAbandonedCarts(minAgeMinutes = 60): Promise<AbandonedCart[]> {
 await ensureTable();
 const rows = (await db()`
  SELECT id, store_slug, email, name, item_id, item_title, item_image
  FROM checkout_attempts
  WHERE status = 'pending'
   AND created_at < now() - (${minAgeMinutes} * interval '1 minute')
   AND created_at > now() - interval '3 days'
  ORDER BY created_at ASC LIMIT 200
 `.catch(() => [])) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
 return rows.map((r) => ({ id: Number(r.id), storeSlug: r.store_slug, email: r.email, name: r.name ?? null, itemId: r.item_id, itemTitle: r.item_title ?? null, itemImage: r.item_image ?? null }));
}

export async function markCartEmailed(id: number): Promise<void> {
 await ensureTable();
 await db()`UPDATE checkout_attempts SET status = 'emailed', emailed_at = now() WHERE id = ${id}`.catch(() => {});
}
