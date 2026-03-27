import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sendPopupAnnouncementEmail } from "@/app/lib/email";

export const maxDuration = 300;

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

async function getAllUserEmails(): Promise<string[]> {
  const sql = neon(getDatabaseUrl());
  // Union users (logged-in accounts) + pilot_access (all signups/waitlist), deduplicated
  const rows = await sql`
    SELECT LOWER(email) AS email FROM users WHERE email IS NOT NULL
    UNION
    SELECT LOWER(email) AS email FROM pilot_access WHERE email IS NOT NULL
  `;
  return rows.map((r) => r.email as string);
}

/**
 * POST /api/admin/send-popup-email
 *
 * { testEmail: "you@example.com" }  — sends only to that address, no real send
 * { send: true }                    — sends to all users
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const testEmail: string | undefined = body?.testEmail;
  const sendForReal: boolean = body?.send === true;

  if (!testEmail && !sendForReal) {
    return NextResponse.json(
      { error: "Provide { testEmail } for a test send or { send: true } to send to all users." },
      { status: 400 }
    );
  }

  if (testEmail) {
    const { sent, failed } = await sendPopupAnnouncementEmail([testEmail]);
    return NextResponse.json({ success: true, test: true, testEmail, sent, failed });
  }

  // Real send to all users
  const emails = await getAllUserEmails();
  const { sent, failed } = await sendPopupAnnouncementEmail(emails);

  return NextResponse.json({ success: true, totalEmails: emails.length, sent, failed });
}
