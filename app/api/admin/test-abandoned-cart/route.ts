import { NextRequest, NextResponse } from "next/server";
import { sendAbandonedCartEmail } from "@/app/lib/email";
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

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const sql = neon(url!);

  // Grab a real product with an image to use as the test
  const rows = await sql`
    SELECT id, title, image, store_name, store_slug, price
    FROM products
    WHERE image IS NOT NULL
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1
  `;

  const p = rows[0] ?? {
    id: 1,
    title: "Vintage Item",
    image: null,
    store_name: "VYA Store",
    store_slug: "vya",
    price: 100,
  };

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://vyaplatform.com";

  await sendAbandonedCartEmail(
    "hana@theviaplatform.com",
    p.title,
    p.image,
    p.store_name,
    `${BASE_URL}/products/${p.store_slug}-${p.id}`,
    Number(p.price),
    "USD",
  );
  return NextResponse.json({ ok: true, sent: "hana@theviaplatform.com", product: p.title });
}
