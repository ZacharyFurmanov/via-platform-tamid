import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

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

/** DELETE /api/admin/delete-product?store=petria-vintage&title=Item+Authentication+Other+Luxury+Bags */
export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = request.nextUrl.searchParams.get("store");
  const title = request.nextUrl.searchParams.get("title");
  if (!store || !title) {
    return NextResponse.json({ error: "store and title params required" }, { status: 400 });
  }

  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return NextResponse.json({ error: "No database URL" }, { status: 500 });

  const sql = neon(url);
  const result = await sql`
    DELETE FROM products
    WHERE store_slug = ${store}
      AND lower(title) = lower(${title})
    RETURNING id, title
  `;

  return NextResponse.json({ success: true, deleted: result.length, rows: result });
}
