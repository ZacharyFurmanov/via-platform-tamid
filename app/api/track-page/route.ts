import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

export async function POST(request: NextRequest) {
 try {
 const body = await request.json();
 const pageType = body?.pageType as string | undefined;
 const pageSlug = body?.pageSlug as string | undefined;
 const userId = body?.userId as string | undefined;
 const sessionId = body?.sessionId as string | undefined;
 const fullPath = body?.fullPath as string | undefined;
 const referrerPath = body?.referrerPath as string | undefined;
 const timeOnPageMs = body?.timeOnPageMs as number | undefined;

 if (!pageType) return NextResponse.json({ ok: false }, { status: 400 });

 const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!dbUrl) return NextResponse.json({ ok: false }, { status: 500 });

 const sql = neon(dbUrl);

 // Ensure table exists (idempotent)
 await sql`
 CREATE TABLE IF NOT EXISTS page_type_views (
 id SERIAL PRIMARY KEY,
 page_type TEXT NOT NULL,
 page_slug TEXT,
 user_id TEXT,
 timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )
 `;
 await sql`CREATE INDEX IF NOT EXISTS idx_ptv_type_ts ON page_type_views(page_type, timestamp)`;
 await sql`CREATE INDEX IF NOT EXISTS idx_ptv_user_ts ON page_type_views(user_id, timestamp) WHERE user_id IS NOT NULL`;

 // Add new session flow columns if they don't exist
 await sql`ALTER TABLE page_type_views ADD COLUMN IF NOT EXISTS session_id TEXT`;
 await sql`ALTER TABLE page_type_views ADD COLUMN IF NOT EXISTS full_path TEXT`;
 await sql`ALTER TABLE page_type_views ADD COLUMN IF NOT EXISTS referrer_path TEXT`;
 await sql`ALTER TABLE page_type_views ADD COLUMN IF NOT EXISTS time_on_page_ms INTEGER`;
 await sql`CREATE INDEX IF NOT EXISTS idx_ptv_session ON page_type_views(session_id) WHERE session_id IS NOT NULL`;

 await sql`
 INSERT INTO page_type_views (page_type, page_slug, user_id, session_id, full_path, referrer_path, time_on_page_ms)
 VALUES (
 ${pageType},
 ${pageSlug ?? null},
 ${userId ?? null},
 ${sessionId ?? null},
 ${fullPath ?? null},
 ${referrerPath ?? null},
 ${typeof timeOnPageMs === "number" ? timeOnPageMs : null}
 )
 `;

 return NextResponse.json({ ok: true });
 } catch {
 return NextResponse.json({ ok: false }, { status: 500 });
 }
}
