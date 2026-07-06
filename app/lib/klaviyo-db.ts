import { neon } from "@neondatabase/serverless";

// Per-store Klaviyo connection — either a pasted private API key OR an OAuth login ("Log in with
// Klaviyo"). VYA pushes the store's customers + events into their Klaviyo; they build emails +
// flows there. VYA stores no email content.

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is not set.");
 return neon(url);
}

export type KlaviyoConnection = {
 authType: "key" | "oauth";
 apiKey: string | null;
 accessToken: string | null;
 refreshToken: string | null;
 expiresAt: string | null;
 accountName: string | null;
 connectedAt: string;
};

let ensured = false;
async function ensure() {
 if (ensured) return;
 const sql = db();
 await sql`CREATE TABLE IF NOT EXISTS klaviyo_connections (
 store_slug TEXT PRIMARY KEY,
 api_key TEXT,
 account_name TEXT,
 connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
 )`;
 // Self-healing for the OAuth path (existing key-only rows keep working).
 await sql`ALTER TABLE klaviyo_connections ADD COLUMN IF NOT EXISTS access_token TEXT`;
 await sql`ALTER TABLE klaviyo_connections ADD COLUMN IF NOT EXISTS refresh_token TEXT`;
 await sql`ALTER TABLE klaviyo_connections ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`;
 await sql`ALTER TABLE klaviyo_connections ADD COLUMN IF NOT EXISTS auth_type TEXT NOT NULL DEFAULT 'key'`;
 ensured = true;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getKlaviyoConnection(storeSlug: string): Promise<KlaviyoConnection | null> {
 await ensure();
 const rows = (await db()`SELECT * FROM klaviyo_connections WHERE store_slug = ${storeSlug} LIMIT 1`.catch(() => [])) as any[];
 if (!rows.length) return null;
 const r = rows[0];
 return {
 authType: (r.auth_type as "key" | "oauth") || "key",
 apiKey: r.api_key ?? null,
 accessToken: r.access_token ?? null,
 refreshToken: r.refresh_token ?? null,
 expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
 accountName: r.account_name ?? null,
 connectedAt: r.connected_at,
 };
}

export async function isKlaviyoConnected(storeSlug: string): Promise<boolean> {
 return !!(await getKlaviyoConnection(storeSlug));
}

export async function saveKlaviyoKey(storeSlug: string, apiKey: string, accountName: string | null): Promise<void> {
 await ensure();
 await db()`INSERT INTO klaviyo_connections (store_slug, auth_type, api_key, access_token, refresh_token, expires_at, account_name, connected_at)
 VALUES (${storeSlug}, 'key', ${apiKey}, NULL, NULL, NULL, ${accountName}, now())
 ON CONFLICT (store_slug) DO UPDATE SET auth_type = 'key', api_key = EXCLUDED.api_key,
 access_token = NULL, refresh_token = NULL, expires_at = NULL, account_name = EXCLUDED.account_name, connected_at = now()`;
}

export async function saveKlaviyoOAuth(storeSlug: string, t: { accessToken: string; refreshToken: string; expiresInSec: number; accountName: string | null }): Promise<void> {
 await ensure();
 const expiresAt = new Date(Date.now() + (t.expiresInSec || 3600) * 1000).toISOString();
 await db()`INSERT INTO klaviyo_connections (store_slug, auth_type, api_key, access_token, refresh_token, expires_at, account_name, connected_at)
 VALUES (${storeSlug}, 'oauth', NULL, ${t.accessToken}, ${t.refreshToken}, ${expiresAt}, ${t.accountName}, now())
 ON CONFLICT (store_slug) DO UPDATE SET auth_type = 'oauth', api_key = NULL, access_token = EXCLUDED.access_token,
 refresh_token = EXCLUDED.refresh_token, expires_at = EXCLUDED.expires_at, account_name = EXCLUDED.account_name, connected_at = now()`;
}

export async function updateKlaviyoAccessToken(storeSlug: string, accessToken: string, expiresInSec: number): Promise<void> {
 await ensure();
 const expiresAt = new Date(Date.now() + (expiresInSec || 3600) * 1000).toISOString();
 await db()`UPDATE klaviyo_connections SET access_token = ${accessToken}, expires_at = ${expiresAt} WHERE store_slug = ${storeSlug}`.catch(() => {});
}

export async function clearKlaviyo(storeSlug: string): Promise<void> {
 await ensure();
 await db()`DELETE FROM klaviyo_connections WHERE store_slug = ${storeSlug}`.catch(() => {});
}
