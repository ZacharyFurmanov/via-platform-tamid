import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return url;
}

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

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const sql = neon(getDatabaseUrl());

  // Look up the user by email
  const users = await sql`
    SELECT id FROM users WHERE LOWER(email) = ${email.toLowerCase().trim()} LIMIT 1
  `;
  if (users.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const userId = users[0].id as string;

  // Get their favorited products (only non-sold-out items in the products table)
  const rows = await sql`
    SELECT
      p.id,
      p.store_slug,
      p.store_name,
      p.title,
      p.price,
      p.image,
      p.images
    FROM product_favorites pf
    JOIN products p ON pf.product_id = p.id
    WHERE pf.user_id = ${userId}
    ORDER BY pf.created_at DESC
  `;

  const products = rows.map((r) => ({
    id: r.id as number,
    storeSlug: r.store_slug as string,
    storeName: r.store_name as string,
    title: r.title as string,
    price: r.price as number,
    image: r.image as string | null,
  }));

  return NextResponse.json({ products, userId });
}
