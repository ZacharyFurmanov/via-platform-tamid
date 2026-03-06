import { neon } from "@neondatabase/serverless";

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is not set.");
  return url;
};

async function initSettingsTable() {
  const sql = neon(getDatabaseUrl());
  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await initSettingsTable();
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${key}, ${value}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

export async function getSetting(key: string): Promise<string | null> {
  const sql = neon(getDatabaseUrl());
  await initSettingsTable();
  const rows = await sql`SELECT value FROM app_settings WHERE key = ${key}`;
  return rows.length > 0 ? (rows[0].value as string) : null;
}
