import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const REASONS = [
  "Too many emails",
  "Not relevant to me",
  "I didn't sign up for this",
  "I found what I was looking for",
  "Other",
] as const;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : null;
  const reason = typeof body.reason === "string" ? body.reason.trim() : null;
  const detail = typeof body.detail === "string" ? body.detail.trim().slice(0, 500) : null;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return NextResponse.json({ error: "No database URL" }, { status: 500 });

  const sql = neon(dbUrl);

  // Ensure column exists
  await sql`ALTER TABLE pilot_access ADD COLUMN IF NOT EXISTS email_unsubscribed BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE pilot_access ADD COLUMN IF NOT EXISTS unsubscribe_reason TEXT`;
  await sql`ALTER TABLE pilot_access ADD COLUMN IF NOT EXISTS unsubscribe_detail TEXT`;
  await sql`ALTER TABLE pilot_access ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ`;

  await sql`
    UPDATE pilot_access
    SET
      email_unsubscribed = TRUE,
      unsubscribe_reason = ${reason},
      unsubscribe_detail = ${detail},
      unsubscribed_at = NOW()
    WHERE email = ${email}
  `;

  return NextResponse.json({ ok: true });
}
