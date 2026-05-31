import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const VALID_SECTIONS = new Set([
  "hero", "how-it-works", "favorites", "collections",
  "stores", "new-arrivals", "categories",
]);

export async function POST(request: Request) {
  try {
    const { section, userId } = await request.json();
    if (!section || !VALID_SECTIONS.has(section)) {
      return new NextResponse(null, { status: 400 });
    }

    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) return new NextResponse(null, { status: 500 });
    const sql = neon(dbUrl);

    await sql`
      CREATE TABLE IF NOT EXISTS homepage_scroll_events (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        section TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_hse_section_ts ON homepage_scroll_events(section, timestamp)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_hse_user ON homepage_scroll_events(user_id) WHERE user_id IS NOT NULL`;

    await sql`
      INSERT INTO homepage_scroll_events (user_id, section)
      VALUES (${userId ?? null}, ${section})
    `;

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
