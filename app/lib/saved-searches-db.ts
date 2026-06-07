import { neon } from "@neondatabase/serverless";

function getSql() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL not set");
 return neon(url);
}

export type SavedSearchFilters = {
 sizes?: string[];
 categories?: string[];
 stores?: string[];
 priceMin?: number | null;
 priceMax?: number | null;
 query?: string;
};

export type SavedSearch = {
 id: number;
 userId: string;
 name: string;
 filters: SavedSearchFilters;
 createdAt: string;
 lastCheckedAt: string;
 lastSeenAt: string;
 unreadCount: number;
};

let _initialized = false;

export async function ensureSavedSearchesTables() {
 if (_initialized) return;
 const sql = getSql();
 await sql`
 CREATE TABLE IF NOT EXISTS saved_searches (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unread_count INT NOT NULL DEFAULT 0
 )
 `;
 await sql`CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id)`;

 await sql`
 CREATE TABLE IF NOT EXISTS user_push_tokens (
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, token)
 )
 `;
 await sql`CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user ON user_push_tokens(user_id)`;
 _initialized = true;
}

function mapRow(r: Record<string, unknown>): SavedSearch {
 return {
 id: Number(r.id),
 userId: String(r.user_id),
 name: String(r.name),
 filters: typeof r.filters === "string" ? JSON.parse(r.filters) : (r.filters as SavedSearchFilters),
 createdAt: (r.created_at as Date).toISOString?.() ?? String(r.created_at),
 lastCheckedAt: (r.last_checked_at as Date).toISOString?.() ?? String(r.last_checked_at),
 lastSeenAt: (r.last_seen_at as Date).toISOString?.() ?? String(r.last_seen_at),
 unreadCount: Number(r.unread_count ?? 0),
 };
}

export async function listSavedSearches(userId: string): Promise<SavedSearch[]> {
 await ensureSavedSearchesTables();
 const sql = getSql();
 const rows = await sql`
 SELECT id, user_id, name, filters, created_at, last_checked_at, last_seen_at, unread_count
 FROM saved_searches
 WHERE user_id = ${userId}
 ORDER BY created_at DESC
 ` as Array<Record<string, unknown>>;
 return rows.map(mapRow);
}

export async function createSavedSearch(
 userId: string,
 name: string,
 filters: SavedSearchFilters,
): Promise<SavedSearch> {
 await ensureSavedSearchesTables();
 const sql = getSql();
 const rows = await sql`
 INSERT INTO saved_searches (user_id, name, filters)
 VALUES (${userId}, ${name}, ${JSON.stringify(filters)}::jsonb)
 RETURNING id, user_id, name, filters, created_at, last_checked_at, last_seen_at, unread_count
 ` as Array<Record<string, unknown>>;
 return mapRow(rows[0]);
}

export async function deleteSavedSearch(userId: string, id: number): Promise<boolean> {
 await ensureSavedSearchesTables();
 const sql = getSql();
 const rows = await sql`
 DELETE FROM saved_searches WHERE id = ${id} AND user_id = ${userId} RETURNING id
 ` as Array<{ id: number }>;
 return rows.length > 0;
}

export async function markSavedSearchSeen(userId: string, id: number): Promise<boolean> {
 await ensureSavedSearchesTables();
 const sql = getSql();
 const rows = await sql`
 UPDATE saved_searches
 SET last_seen_at = NOW(), unread_count = 0
 WHERE id = ${id} AND user_id = ${userId}
 RETURNING id
 ` as Array<{ id: number }>;
 return rows.length > 0;
}

export async function getAllSavedSearches(): Promise<SavedSearch[]> {
 await ensureSavedSearchesTables();
 const sql = getSql();
 const rows = await sql`
 SELECT id, user_id, name, filters, created_at, last_checked_at, last_seen_at, unread_count
 FROM saved_searches
 ` as Array<Record<string, unknown>>;
 return rows.map(mapRow);
}

export async function updateSavedSearchMatchCount(
 id: number,
 newMatches: number,
): Promise<void> {
 await ensureSavedSearchesTables();
 const sql = getSql();
 await sql`
 UPDATE saved_searches
 SET last_checked_at = NOW(),
   unread_count = unread_count + ${newMatches}
 WHERE id = ${id}
 `;
}

export async function registerPushToken(
 userId: string,
 token: string,
 platform: string | null,
): Promise<void> {
 await ensureSavedSearchesTables();
 const sql = getSql();
 await sql`
 INSERT INTO user_push_tokens (user_id, token, platform)
 VALUES (${userId}, ${token}, ${platform})
 ON CONFLICT (user_id, token) DO NOTHING
 `;
}

export async function getPushTokensForUser(userId: string): Promise<string[]> {
 await ensureSavedSearchesTables();
 const sql = getSql();
 const rows = await sql`
 SELECT token FROM user_push_tokens WHERE user_id = ${userId}
 ` as Array<{ token: string }>;
 return rows.map((r) => r.token);
}
