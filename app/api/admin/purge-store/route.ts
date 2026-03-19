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
  const adminToken = request.cookies.get("via_admin_token")?.value;
  if (adminToken && adminToken === hashPassword(adminPassword)) return true;
  return false;
}

/** DELETE /api/admin/purge-store?slug=kiki-d-design-and-consign */
export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug param required" }, { status: 400 });
  }

  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return NextResponse.json({ error: "No database URL" }, { status: 500 });

  const sql = neon(url);
  const result = await sql`
    DELETE FROM products WHERE store_slug = ${slug}
  `;

  return NextResponse.json({ success: true, deleted: result.length ?? 0, slug });
}
