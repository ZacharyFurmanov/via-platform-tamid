import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sendPilotApprovalEmail } from "@/app/lib/email";
import crypto from "crypto";

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

  // Fetch all pending users
  const pending = await sql`
    SELECT email, first_name FROM pilot_access WHERE status = 'pending'
  ` as { email: string; first_name: string | null }[];

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, approved: 0 });
  }

  // Bulk approve in one query
  const emails = pending.map((r) => r.email);
  await sql`
    UPDATE pilot_access
    SET status = 'approved', approved_at = NOW()
    WHERE email = ANY(${emails as unknown as string[]}) AND status = 'pending'
  `;

  // Send approval emails — fire and forget (don't block the response)
  (async () => {
    for (const { email, first_name } of pending) {
      try {
        await sendPilotApprovalEmail(email, first_name ?? undefined);
        // Small delay to avoid hitting Resend rate limits
        await new Promise((r) => setTimeout(r, 150));
      } catch (err) {
        console.error("[approve-all] email failed for", email, err);
      }
    }
  })();

  return NextResponse.json({ ok: true, approved: pending.length });
}
