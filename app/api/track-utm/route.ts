import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

const SOURCE_ALIASES: Record<string, string> = {
  ig: "instagram",
  fb: "facebook",
  tw: "twitter",
  tt: "tiktok",
  yt: "youtube",
  li: "linkedin",
};

function normalizeSource(s: string): string {
  const lower = s.toLowerCase().trim();
  return SOURCE_ALIASES[lower] ?? lower;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawSource = body?.utm_source as string | undefined;
    const utmSource = rawSource ? normalizeSource(rawSource) : undefined;
    const utmMedium = body?.utm_medium as string | undefined;
    const utmCampaign = body?.utm_campaign as string | undefined;
    const utmContent = body?.utm_content as string | undefined;
    const utmTerm = body?.utm_term as string | undefined;
    const landingPath = body?.landing_path as string | undefined;
    const userId = body?.user_id as string | undefined;

    if (!utmSource) return NextResponse.json({ ok: false }, { status: 400 });

    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) return NextResponse.json({ ok: false }, { status: 500 });

    const sql = neon(dbUrl);

    await sql`
      CREATE TABLE IF NOT EXISTS utm_visits (
        id           SERIAL PRIMARY KEY,
        utm_source   TEXT NOT NULL,
        utm_medium   TEXT,
        utm_campaign TEXT,
        utm_content  TEXT,
        utm_term     TEXT,
        landing_path TEXT,
        user_id      TEXT,
        timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_utm_source_ts ON utm_visits(utm_source, timestamp)`;

    await sql`
      INSERT INTO utm_visits (utm_source, utm_medium, utm_campaign, utm_content, utm_term, landing_path, user_id)
      VALUES (
        ${utmSource},
        ${utmMedium ?? null},
        ${utmCampaign ?? null},
        ${utmContent ?? null},
        ${utmTerm ?? null},
        ${landingPath ?? null},
        ${userId ?? null}
      )
    `;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
