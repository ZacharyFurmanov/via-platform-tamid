import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");
    const rows = await sql`
      SELECT
        store_slug,
        store_name,
        COUNT(*) AS total,
        COUNT(variant_id) AS with_variant_id,
        COUNT(*) - COUNT(variant_id) AS missing_variant_id,
        COUNT(shopify_product_id) AS with_shopify_product_id,
        COUNT(*) - COUNT(shopify_product_id) AS missing_shopify_product_id,
        COUNT(collabs_link) AS with_collabs_link
      FROM products
      GROUP BY store_slug, store_name
      ORDER BY store_name
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
