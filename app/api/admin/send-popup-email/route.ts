import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sendPopupAnnouncementEmail } from "@/app/lib/email";

export const maxDuration = 300;

const CAMPAIGN = "nyc-popup-2026-03-29";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return url;
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminToken = request.cookies.get("via_admin_token")?.value;
  if (adminToken && adminToken === hashPassword(adminPassword)) return true;
  return false;
}

async function ensureSentTable() {
  const sql = neon(getDatabaseUrl());
  await sql`
    CREATE TABLE IF NOT EXISTS email_campaign_sends (
      id SERIAL PRIMARY KEY,
      campaign VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE (campaign, email)
    )
  `;
}

async function getAlreadySentEmails(campaign: string): Promise<Set<string>> {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    SELECT LOWER(email) AS email FROM email_campaign_sends
    WHERE campaign = ${campaign}
  `;
  return new Set(rows.map((r) => r.email as string));
}

async function markEmailsAsSent(campaign: string, emails: string[]) {
  if (emails.length === 0) return;
  const sql = neon(getDatabaseUrl());
  for (const email of emails) {
    await sql`
      INSERT INTO email_campaign_sends (campaign, email)
      VALUES (${campaign}, ${email.toLowerCase()})
      ON CONFLICT (campaign, email) DO NOTHING
    `;
  }
}

async function getUnsentEmails(campaign: string): Promise<string[]> {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    SELECT LOWER(email) AS email FROM users WHERE email IS NOT NULL
    UNION
    SELECT LOWER(email) AS email FROM pilot_access WHERE email IS NOT NULL
  `;
  const all = rows.map((r) => r.email as string);
  const alreadySent = await getAlreadySentEmails(campaign);
  return all.filter((e) => !alreadySent.has(e));
}

/**
 * POST /api/admin/send-popup-email
 *
 * { testEmail: "you@example.com" }  — test send only, not tracked
 * { send: true }                    — sends only to people who haven't received this campaign yet
 * { preview: true }                 — returns counts without sending
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSentTable();

  const body = await request.json().catch(() => ({}));
  const testEmail: string | undefined = body?.testEmail;
  const sendForReal: boolean = body?.send === true;
  const preview: boolean = body?.preview === true;
  const backfill: boolean = body?.backfill === true;

  if (!testEmail && !sendForReal && !preview && !backfill) {
    return NextResponse.json(
      { error: "Provide { testEmail }, { send: true }, { preview: true }, or { backfill: true }." },
      { status: 400 }
    );
  }

  // Backfill: mark all emails in the `users` table as already sent (they got the first batch)
  if (backfill) {
    const sql = neon(getDatabaseUrl());
    const rows = await sql`SELECT LOWER(email) AS email FROM users WHERE email IS NOT NULL`;
    const emails = rows.map((r) => r.email as string);
    await markEmailsAsSent(CAMPAIGN, emails);
    return NextResponse.json({ success: true, backfilled: emails.length, campaign: CAMPAIGN });
  }

  // Test send — not tracked so it won't block the real send later
  if (testEmail) {
    const { sent, failed } = await sendPopupAnnouncementEmail([testEmail]);
    return NextResponse.json({ success: true, test: true, testEmail, sent, failed });
  }

  const unsent = await getUnsentEmails(CAMPAIGN);

  if (preview) {
    const alreadySent = await getAlreadySentEmails(CAMPAIGN);
    return NextResponse.json({
      preview: true,
      campaign: CAMPAIGN,
      alreadySent: alreadySent.size,
      toSend: unsent.length,
    });
  }

  // Real send — only to people who haven't received this campaign
  if (unsent.length === 0) {
    return NextResponse.json({ success: true, message: "Everyone has already been sent this email.", sent: 0 });
  }

  const { sent, failed } = await sendPopupAnnouncementEmail(unsent);

  // Mark successfully sent emails (approximate — mark all unsent since we don't get per-email status back)
  await markEmailsAsSent(CAMPAIGN, unsent);

  return NextResponse.json({ success: true, campaign: CAMPAIGN, toSend: unsent.length, sent, failed });
}
