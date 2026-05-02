import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  if (request.headers.get("authorization") === `Bearer ${adminPassword}`) return true;
  const token = request.cookies.get("via_admin_token")?.value;
  return token === crypto.createHash("sha256").update(adminPassword).digest("hex");
}

// GET /api/admin/products/search?store=storeSlug&q=query
// Searches current inventory + sold items for the store
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = request.nextUrl.searchParams.get("store");
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!store) return NextResponse.json({ error: "store is required" }, { status: 400 });

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return NextResponse.json({ error: "No database" }, { status: 500 });

  const sql = neon(dbUrl);
  const pattern = `%${q}%`;

  const [currentRows, soldRows] = await Promise.all([
    sql`
      SELECT title, price, image, 'current' AS source
      FROM products
      WHERE store_slug = ${store}
        AND (${q} = '' OR title ILIKE ${pattern})
      ORDER BY title
      LIMIT 30
    `,
    sql`
      SELECT title, final_price AS price, image, 'sold' AS source
      FROM sold_items
      WHERE store_slug = ${store}
        AND (${q} = '' OR title ILIKE ${pattern})
      ORDER BY sold_at DESC
      LIMIT 30
    `,
  ]);

  // Deduplicate by title (prefer current over sold)
  const seen = new Set<string>();
  const products: { title: string; price: number; image: string | null; source: string }[] = [];

  for (const row of [...currentRows, ...soldRows]) {
    const key = (row.title as string).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      products.push({
        title: row.title as string,
        price: Number(row.price),
        image: row.image as string | null,
        source: row.source as string,
      });
    }
  }

  return NextResponse.json({ products });
}
