import { neon } from "@neondatabase/serverless";

// Platform-agnostic store connections. Each row holds a seller's API credentials
// for one platform (Shopify, Square, Wix, …); the platform adapter knows how to
// use them. Credentials are a JSONB blob so each platform can store what it needs.

function getDatabaseUrl() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set.");
 return url;
}

let ensured = false;
async function ensureTable() {
 if (ensured) return;
 const sql = neon(getDatabaseUrl());
 await sql`CREATE TABLE IF NOT EXISTS store_connections (
 store_slug TEXT PRIMARY KEY,
 platform TEXT NOT NULL,
 credentials JSONB NOT NULL,
 label TEXT,
 connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
 )`;
 ensured = true;
}

export type StoreConnection = { storeSlug: string; platform: string; credentials: Record<string, string>; label: string | null };

export async function saveConnection(storeSlug: string, platform: string, credentials: Record<string, string>, label: string | null): Promise<void> {
 await ensureTable();
 const sql = neon(getDatabaseUrl());
 await sql`INSERT INTO store_connections (store_slug, platform, credentials, label)
 VALUES (${storeSlug}, ${platform}, ${JSON.stringify(credentials)}::jsonb, ${label})
 ON CONFLICT (store_slug) DO UPDATE SET platform = ${platform}, credentials = ${JSON.stringify(credentials)}::jsonb, label = ${label}, connected_at = now()`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getConnection(storeSlug: string): Promise<StoreConnection | null> {
 await ensureTable();
 const sql = neon(getDatabaseUrl());
 const rows = await sql`SELECT * FROM store_connections WHERE store_slug = ${storeSlug}`;
 if (!rows.length) return null;
 const r: any = rows[0];
 const creds = typeof r.credentials === "string" ? JSON.parse(r.credentials) : r.credentials || {};
 return { storeSlug: r.store_slug, platform: r.platform, credentials: creds, label: r.label ?? null };
}

export async function deleteConnection(storeSlug: string): Promise<void> {
 await ensureTable();
 const sql = neon(getDatabaseUrl());
 await sql`DELETE FROM store_connections WHERE store_slug = ${storeSlug}`;
}
