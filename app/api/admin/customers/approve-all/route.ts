import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
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

  // Ensure approval_email_sent column exists
  await sql`ALTER TABLE pilot_access ADD COLUMN IF NOT EXISTS approval_email_sent BOOLEAN DEFAULT false`;

  // Bulk approve all pending, marking email as not yet sent
  const result = await sql`
    UPDATE pilot_access
    SET status = 'approved', approved_at = NOW(), approval_email_sent = false
    WHERE status = 'pending'
    RETURNING email
  `;

  return NextResponse.json({ ok: true, approved: result.length });
}
