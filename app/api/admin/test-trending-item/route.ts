import { NextResponse } from "next/server";
import { sendTrendingItemEmail } from "@/app/lib/email";
import { neon } from "@neondatabase/serverless";

export async function GET() {
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

  await sendTrendingItemEmail(
    "hana@theviaplatform.com",
    p.title,
    p.image,
    p.store_name,
    `${BASE_URL}/products/${p.store_slug}-${p.id}`,
    17,
    Number(p.price),
    "USD",
  );
  return NextResponse.json({ ok: true, sent: "hana@theviaplatform.com", product: p.title });
}
