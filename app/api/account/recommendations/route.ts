import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { neon } from "@neondatabase/serverless";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return NextResponse.json({ error: "No database" }, { status: 500 });

  const sql = neon(url);
  const userId = session.user.id;

  // Find products from stores the user has already favorited items from,
  // excluding products they've already saved. Weighted by global popularity.
  const rows = await sql`
    WITH user_store_slugs AS (
      SELECT DISTINCT p.store_slug
      FROM product_favorites pf
      JOIN products p ON p.id = pf.product_id
      WHERE pf.user_id = ${userId}
    ),
    user_favorited_ids AS (
      SELECT product_id FROM product_favorites WHERE user_id = ${userId}
    )
    SELECT
      p.id,
      p.store_slug,
      p.store_name,
      p.title,
      p.price,
      p.currency,
      p.image,
      p.images,
      p.external_url,
      p.size,
      COUNT(pf.id)::int AS fav_count
    FROM products p
    LEFT JOIN product_favorites pf ON pf.product_id = p.id
    WHERE
      p.price > 0
      AND p.image IS NOT NULL AND p.image != ''
      AND p.id NOT IN (SELECT product_id FROM user_favorited_ids)
      AND p.store_slug IN (SELECT store_slug FROM user_store_slugs)
    GROUP BY p.id
    ORDER BY fav_count DESC, RANDOM()
    LIMIT 200
  `;

  return NextResponse.json({ products: rows });
}
