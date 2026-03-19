import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sendPilotApprovalEmail } from "@/app/lib/email";
import crypto from "crypto";

export const maxDuration = 60;

function isAdminAuthenticated(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminToken = request.cookies.get("via_admin_token")?.value;
  return !!adminToken && adminToken === crypto.createHash("sha256").update(adminPassword).digest("hex");
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return NextResponse.json({ error: "No DB" }, { status: 500 });
  const sql = neon(url);

  // Ensure column exists
  await sql`ALTER TABLE pilot_access ADD COLUMN IF NOT EXISTS approval_email_sent BOOLEAN DEFAULT false`;

  // Grab next batch of approved users who haven't received an email
  const batch = await sql`
    SELECT email, first_name FROM pilot_access
    WHERE status = 'approved' AND (approval_email_sent IS NULL OR approval_email_sent = false)
    LIMIT 50
  ` as { email: string; first_name: string | null }[];

  let sent = 0;
  for (const { email, first_name } of batch) {
    try {
      await sendPilotApprovalEmail(email, first_name ?? undefined);
      await sql`UPDATE pilot_access SET approval_email_sent = true WHERE email = ${email}`;
      sent++;
    } catch (err) {
      console.error("[send-emails] failed for", email, err);
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  // Count remaining
  const remaining = await sql`
    SELECT COUNT(*)::int AS cnt FROM pilot_access
    WHERE status = 'approved' AND (approval_email_sent IS NULL OR approval_email_sent = false)
  `;

  return NextResponse.json({
    ok: true,
    sent,
    remaining: (remaining[0]?.cnt as number) ?? 0,
  });
}
