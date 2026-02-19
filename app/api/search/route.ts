import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { stores } from "@/app/lib/stores";
import { brands } from "@/app/lib/brandData";
import { categoryMap } from "@/app/lib/categoryMap";

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
    return NextResponse.json({ products: [], designers: [], categories: [], stores: [] });
  }

  try {
    const sql = neon(getDatabaseUrl());

    // 1. Match designers/brands
    const matchedDesigners = brands
      .filter((b) =>
        b.label.toLowerCase().includes(q) ||
        b.keywords.some((kw) => kw.includes(q) || q.includes(kw))
      )
      .slice(0, 6)
      .map((b) => ({ slug: b.slug, label: b.label }));

    // 2. Match categories
    const matchedCategories: { slug: string; label: string }[] = [];
    for (const [slug, label] of Object.entries(categoryMap)) {
      if (
        slug.includes(q) ||
        label.toLowerCase().includes(q) ||
        categoryAliases[q] === slug
      ) {
        matchedCategories.push({ slug, label });
      }
    }
    // Also check if query matches a category keyword
    for (const [slug, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((kw) => kw.includes(q) || q.includes(kw))) {
        const label = categoryMap[slug as keyof typeof categoryMap];
        if (label && !matchedCategories.find((c) => c.slug === slug)) {
          matchedCategories.push({ slug, label });
        }
      }
    }

    // 3. Match stores
    const matchedStores = stores
      .filter((s) => s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q))
      .slice(0, 5)
      .map((s) => ({ slug: s.slug, name: s.name, location: s.location }));

    // 4. Product search
    const categorySlug = categoryKeywords[q]
      ? q
      : categoryAliases[q] || null;

    let products;

    if (categorySlug && categoryKeywords[categorySlug]) {
      const keywords = categoryKeywords[categorySlug];
      const patterns = keywords.map((k) => `%${k}%`);

      products = await sql`
        SELECT id, store_slug, store_name, title, price, currency, image
        FROM products
        WHERE LOWER(title) LIKE ANY(${patterns})
        ORDER BY title
        LIMIT 50
      `;
    } else {
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
      designers: matchedDesigners,
      categories: matchedCategories,
      stores: matchedStores,
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
    return NextResponse.json({ products: [], designers: [], categories: [], stores: [] }, { status: 500 });
  }
}
