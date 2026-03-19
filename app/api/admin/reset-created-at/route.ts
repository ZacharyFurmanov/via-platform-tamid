import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const token = request.cookies.get("via_admin_token")?.value;
  return !!token && token === crypto.createHash("sha256").update(adminPassword).digest("hex");
}

/**
 * POST /api/admin/reset-created-at
 *
 * One-time wipe: marks all existing products as insider_notified = TRUE
 * so they don't appear on the Insider page or trigger another email blast.
 * Safe to run multiple times.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");

  const result = await sql`
    UPDATE products SET insider_notified = TRUE
    WHERE insider_notified = FALSE OR insider_notified IS NULL
    RETURNING id
  `;

  return NextResponse.json({
    ok: true,
    message: `Marked ${result.length} products as already notified. Insider page and email cron are now fresh — only new products synced going forward will appear.`,
    count: result.length,
  });
}
