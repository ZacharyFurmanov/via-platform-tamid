import { NextRequest, NextResponse } from "next/server";
import { sendNewArrivalsEmail } from "@/app/lib/email";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";
import type { DBProduct } from "@/app/lib/db";

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

  const to = request.nextUrl.searchParams.get("to") ?? "hana@vyaplatform.com";

  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const sql = neon(url!);

  const rows = await sql`
    SELECT id, title, price, image, images, store_name, store_slug, url, condition, description
    FROM products
    WHERE image IS NOT NULL
    ORDER BY created_at DESC NULLS LAST
    LIMIT 12
  `;

  const products = rows.map((r) => ({
    id: r.id as number,
    title: r.title as string,
    price: Number(r.price),
    image: r.image as string,
    images: r.images as string[] | undefined,
    store_name: r.store_name as string,
    store_slug: r.store_slug as string,
    url: r.url as string,
    condition: r.condition as string | undefined,
    description: r.description as string | undefined,
  })) as DBProduct[];

  const { sent, failed } = await sendNewArrivalsEmail([to], products);
  return NextResponse.json({ ok: true, sent, failed, to, productCount: products.length });
}
