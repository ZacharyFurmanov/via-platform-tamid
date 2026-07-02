import { neon } from "@neondatabase/serverless";

// Per-store Shopify connection (Storefront API token) for high-fidelity import.

function getDatabaseUrl() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set.");
 return url;
}

let ensured = false;
async function ensureTable() {
 if (ensured) return;
 const sql = neon(getDatabaseUrl());
 await sql`CREATE TABLE IF NOT EXISTS shopify_connections (
 store_slug TEXT PRIMARY KEY,
 shop_domain TEXT NOT NULL,
 storefront_token TEXT NOT NULL,
 shop_name TEXT,
 connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
 )`;
 ensured = true;
}

export type ShopifyConnection = { storeSlug: string; shopDomain: string; token: string; shopName: string | null };

export async function saveConnection(storeSlug: string, shopDomain: string, token: string, shopName: string | null): Promise<void> {
 await ensureTable();
 const sql = neon(getDatabaseUrl());
 await sql`INSERT INTO shopify_connections (store_slug, shop_domain, storefront_token, shop_name)
 VALUES (${storeSlug}, ${shopDomain}, ${token}, ${shopName})
 ON CONFLICT (store_slug) DO UPDATE SET shop_domain = ${shopDomain}, storefront_token = ${token}, shop_name = ${shopName}, connected_at = now()`;
}

export async function getConnection(storeSlug: string): Promise<ShopifyConnection | null> {
 await ensureTable();
 const sql = neon(getDatabaseUrl());
 const rows = await sql`SELECT * FROM shopify_connections WHERE store_slug = ${storeSlug}`;
 if (!rows.length) return null;
 const r = rows[0];
 return { storeSlug: r.store_slug as string, shopDomain: r.shop_domain as string, token: r.storefront_token as string, shopName: (r.shop_name as string) ?? null };
}

export async function deleteConnection(storeSlug: string): Promise<void> {
 await ensureTable();
 const sql = neon(getDatabaseUrl());
 await sql`DELETE FROM shopify_connections WHERE store_slug = ${storeSlug}`;
}
