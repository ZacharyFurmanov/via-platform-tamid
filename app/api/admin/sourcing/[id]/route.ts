import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

function hashPassword(password: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(password).digest("hex");
}
function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const token = request.cookies.get("via_admin_token")?.value;
  return token === hashPassword(adminPassword);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return NextResponse.json({ error: "No database" }, { status: 500 });

  const body = await request.json();
  const { status, matchedStoreSlug } = body;

  const validStatuses = ["pending_payment", "paid", "matched", "refunded"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const sql = neon(dbUrl);
  const id = params.id;

  if (status === "matched" && matchedStoreSlug) {
    await sql`
      UPDATE sourcing_requests
      SET status = ${status},
          matched_store_slug = ${matchedStoreSlug},
          matched_store_at = NOW()
      WHERE id = ${id}
    `;
  } else if (status) {
    await sql`
      UPDATE sourcing_requests
      SET status = ${status},
          matched_store_slug = CASE WHEN ${status} != 'matched' THEN NULL ELSE matched_store_slug END,
          matched_store_at = CASE WHEN ${status} != 'matched' THEN NULL ELSE matched_store_at END
      WHERE id = ${id}
    `;
  }

  return NextResponse.json({ ok: true });
}
