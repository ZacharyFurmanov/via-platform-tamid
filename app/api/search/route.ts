import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is not set.");
  return url;
};

// Map category search terms to title keywords that indicate that category
const categoryKeywords: Record<string, string[]> = {
  bags: ["bag", "clutch", "tote", "purse", "handbag"],
  shoes: [
    "heel", "shoe", "boot", "pump", "sandal", "mule", "clog", "loafer",
    "sneaker", "slipper", "espadrille", "stiletto", "wedge", "oxford",
    "derby", "brogue", "trainer", "slide", "flat", "slingback",
  ],
  accessories: [
    "belt", "scarf", "hat", "sunglasses", "jewelry", "necklace",
    "bracelet", "earring", "watch", "ring", "glove", "tie", "wallet",
  ],
  clothes: [
    "jacket", "coat", "blazer", "dress", "skirt", "pants", "trousers",
    "jeans", "blouse", "shirt", "sweater", "cardigan", "vest", "suit",
    "jumpsuit", "romper", "shorts", "cape", "poncho", "top", "hoodie",
    "sweatshirt", "tee", "t-shirt",
  ],
};

// Aliases so users can type plural/alternate forms
const categoryAliases: Record<string, string> = {
  bag: "bags",
  shoe: "shoes",
  boot: "shoes",
  boots: "shoes",
  heels: "shoes",
  sneakers: "shoes",
  sandals: "shoes",
  clothing: "clothes",
  shirt: "clothes",
  shirts: "clothes",
  dress: "clothes",
  dresses: "clothes",
  jacket: "clothes",
  jackets: "clothes",
  pants: "clothes",
  jeans: "clothes",
  tops: "clothes",
  accessory: "accessories",
  belts: "accessories",
  scarves: "accessories",
  hats: "accessories",
  jewelry: "accessories",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase();

  if (!q || q.length < 2) {
    return NextResponse.json({ products: [] });
  }

  try {
    const sql = neon(getDatabaseUrl());

    // Check if the query matches a category
    const categorySlug = categoryKeywords[q]
      ? q
      : categoryAliases[q] || null;

    let products;

    if (categorySlug && categoryKeywords[categorySlug]) {
      const keywords = categoryKeywords[categorySlug];
      // Build a pattern like '%bag%|%clutch%|%tote%' for ILIKE ANY
      const patterns = keywords.map((k) => `%${k}%`);

      products = await sql`
        SELECT id, store_slug, store_name, title, price, currency, image
        FROM products
        WHERE LOWER(title) LIKE ANY(${patterns})
        ORDER BY title
        LIMIT 50
      `;
    } else {
      // Direct title search
      const pattern = `%${q}%`;
      products = await sql`
        SELECT id, store_slug, store_name, title, price, currency, image
        FROM products
        WHERE LOWER(title) LIKE ${pattern}
        ORDER BY title
        LIMIT 50
      `;
    }

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.title,
        storeSlug: p.store_slug,
        storeName: p.store_name,
        price: `$${Number(p.price)}`,
        image: p.image,
      })),
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
