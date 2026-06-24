import { neon } from "@neondatabase/serverless";

const getDatabaseUrl = () => {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set.");
 return url;
};

let initialized = false;
async function init() {
 if (initialized) return;
 const sql = neon(getDatabaseUrl());
 await sql`
 CREATE TABLE IF NOT EXISTS store_follows (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  push_token TEXT,
  store_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_notified_at TIMESTAMPTZ,
  UNIQUE(device_id, store_slug)
 )`;
 await sql`CREATE INDEX IF NOT EXISTS idx_store_follows_slug ON store_follows(store_slug)`;
 initialized = true;
}

/** Replace a device's followed stores with the given set (and refresh its push token). */
export async function setFollows(deviceId: string, pushToken: string | null, stores: string[]): Promise<void> {
 await init();
 const sql = neon(getDatabaseUrl());
 const slugs = Array.from(new Set(stores.filter(Boolean)));

 if (slugs.length === 0) {
 await sql`DELETE FROM store_follows WHERE device_id = ${deviceId}`;
 return;
 }
 // Drop unfollowed rows, then upsert the current set (keeping last_notified_at).
 await sql`DELETE FROM store_follows WHERE device_id = ${deviceId} AND store_slug != ALL(${slugs})`;
 for (const slug of slugs) {
 await sql`
  INSERT INTO store_follows (device_id, push_token, store_slug)
  VALUES (${deviceId}, ${pushToken}, ${slug})
  ON CONFLICT (device_id, store_slug) DO UPDATE SET push_token = EXCLUDED.push_token
 `;
 }
}

export async function getFollows(deviceId: string): Promise<string[]> {
 await init();
 const sql = neon(getDatabaseUrl());
 const rows = (await sql`SELECT store_slug FROM store_follows WHERE device_id = ${deviceId}`) as Array<{ store_slug: string }>;
 return rows.map((r) => r.store_slug);
}

export type PendingFollowNotification = {
 id: number;
 pushToken: string;
 storeSlug: string;
 newCount: number;
};

/** Follows that have new products since the follower was last notified. */
export async function getPendingFollowNotifications(): Promise<PendingFollowNotification[]> {
 await init();
 const sql = neon(getDatabaseUrl());
 const rows = (await sql`
 SELECT f.id, f.push_token, f.store_slug,
  (SELECT COUNT(*) FROM products p
   WHERE p.store_slug = f.store_slug
    AND p.image IS NOT NULL AND p.image != ''
    AND p.created_at > COALESCE(f.last_notified_at, f.created_at))::int AS new_count
 FROM store_follows f
 WHERE f.push_token IS NOT NULL
 `) as Array<{ id: number; push_token: string; store_slug: string; new_count: number }>;
 return rows
 .filter((r) => r.new_count > 0)
 .map((r) => ({ id: r.id, pushToken: r.push_token, storeSlug: r.store_slug, newCount: r.new_count }));
}

export async function markFollowsNotified(ids: number[]): Promise<void> {
 if (ids.length === 0) return;
 const sql = neon(getDatabaseUrl());
 await sql`UPDATE store_follows SET last_notified_at = NOW() WHERE id = ANY(${ids})`;
}
