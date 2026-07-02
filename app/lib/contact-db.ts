import { neon } from "@neondatabase/serverless";

// Contact-form submissions from a store's hosted storefront. Kept per-store so
// the seller can read inquiries from their portal.

function getDatabaseUrl() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set.");
 return url;
}

let ensured = false;
async function ensureTable() {
 if (ensured) return;
 const sql = neon(getDatabaseUrl());
 await sql`CREATE TABLE IF NOT EXISTS contact_messages (
 id SERIAL PRIMARY KEY,
 store_slug TEXT NOT NULL,
 name TEXT,
 email TEXT,
 message TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
 )`;
 await sql`CREATE INDEX IF NOT EXISTS idx_contact_messages_store ON contact_messages (store_slug, created_at DESC)`;
 ensured = true;
}

export async function createContactMessage(storeSlug: string, m: { name?: string; email?: string; message: string }): Promise<void> {
 await ensureTable();
 const sql = neon(getDatabaseUrl());
 await sql`INSERT INTO contact_messages (store_slug, name, email, message)
 VALUES (${storeSlug}, ${m.name ?? null}, ${m.email ?? null}, ${m.message})`;
}

export type ContactMessage = { id: number; storeSlug: string; name: string | null; email: string | null; message: string; createdAt: string };

export async function getContactMessages(storeSlug: string): Promise<ContactMessage[]> {
 await ensureTable();
 const sql = neon(getDatabaseUrl());
 const rows = await sql`SELECT * FROM contact_messages WHERE store_slug = ${storeSlug} ORDER BY created_at DESC LIMIT 200`;
 return rows.map((r) => ({ id: r.id as number, storeSlug: r.store_slug as string, name: r.name as string | null, email: r.email as string | null, message: r.message as string, createdAt: r.created_at as string }));
}
