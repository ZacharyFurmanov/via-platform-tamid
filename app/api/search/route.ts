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

// Aliases: common search terms → category slug
const categoryAliases: Record<string, string> = {
  // bags
  bag: "bags", pouch: "bags", clutch: "bags", tote: "bags", purse: "bags",
  backpack: "bags", satchel: "bags", crossbody: "bags",
  // shoes
  shoe: "shoes", shoes: "shoes", boot: "shoes", boots: "shoes",
  heels: "shoes", sneakers: "shoes", sandals: "shoes", loafers: "shoes",
  // clothing
  clothing: "clothing", clothes: "clothing",
  top: "tops", tops: "tops", shirt: "tops", shirts: "tops", blouse: "tops",
  dress: "dresses", dresses: "dresses",
  jacket: "coats-jackets", jackets: "coats-jackets",
  coat: "coats-jackets", coats: "coats-jackets", blazer: "coats-jackets",
  pants: "pants", trousers: "pants",
  jean: "jeans", denim: "jeans",
  skirt: "skirts", skirts: "skirts",
  sweater: "sweaters", sweaters: "sweaters", knitwear: "sweaters",
  short: "shorts",
  jumpsuit: "jumpsuits", romper: "jumpsuits",
  // accessories
  accessory: "accessories", accessories: "accessories",
  belt: "accessories", belts: "accessories",
  scarf: "accessories", scarves: "accessories",
  hat: "accessories", hats: "accessories",
  jewelry: "accessories", jewellery: "accessories",
  ring: "accessories", rings: "accessories",
  necklace: "accessories", necklaces: "accessories",
  bracelet: "accessories", bracelets: "accessories",
  earring: "accessories", earrings: "accessories",
  watch: "accessories", watches: "accessories",
  sunglasses: "accessories",
  wallet: "wallets", wallets: "wallets",
  "coin purse": "wallets", cardholder: "wallets", "card holder": "wallets",
};

// Category slug → title keywords for DB search
const categoryKeywords: Record<string, string[]> = {
  bags: ["bag", "clutch", "tote", "purse", "handbag", "pouch", "backpack", "rucksack", "satchel", "crossbody", "wristlet", "minaudiere"],
  shoes: ["heel", "shoe", "boot", "pump", "sandal", "mule", "clog", "loafer", "sneaker", "slipper", "espadrille", "stiletto", "wedge", "oxford", "derby", "brogue", "trainer", "slide", "slingback", "mary jane", "moccasin"],
  accessories: ["belt", "scarf", "hat", "sunglasses", "jewelry", "necklace", "bracelet", "earring", "watch", "ring", "wallet", "brooch", "pendant", "bangle", "choker", "anklet"],
  clothing: ["jacket", "coat", "blazer", "dress", "skirt", "pants", "trousers", "jeans", "blouse", "shirt", "sweater", "cardigan", "vest", "suit", "jumpsuit", "romper", "shorts", "cape", "top", "hoodie", "sweatshirt", "tee", "t-shirt", "bodysuit", "corset", "tunic", "cami", "kimono"],
  tops: ["top", "blouse", "shirt", "tee", "t-shirt", "tank", "cami", "bodysuit", "corset", "bustier", "halter", "polo", "henley", "tunic"],
  dresses: ["dress", "gown", "kaftan", "sundress"],
  "coats-jackets": ["coat", "jacket", "blazer", "parka", "windbreaker", "puffer", "bomber", "trench", "overcoat", "cape", "poncho", "anorak", "kimono", "vest", "suit"],
  sweaters: ["sweater", "cardigan", "knit", "pullover", "hoodie", "sweatshirt", "turtleneck", "crewneck"],
  jeans: ["jeans", "denim"],
  pants: ["pants", "trousers", "chino", "jogger", "legging", "culottes"],
  skirts: ["skirt", "sarong"],
  shorts: ["shorts"],
  jumpsuits: ["jumpsuit", "romper", "playsuit", "overall", "matching set"],
  wallets: ["wallet", "coin purse", "card holder", "cardholder", "billfold", "card case"],
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
      .slice(0, 5)
      .map((b) => ({ slug: b.slug, label: b.label }));

    // 2. Match categories
    const matchedCategories: { slug: string; label: string }[] = [];
    const seenSlugs = new Set<string>();

    const aliasTarget = categoryAliases[q];
    if (aliasTarget) {
      const label = categoryMap[aliasTarget as keyof typeof categoryMap];
      if (label && !seenSlugs.has(aliasTarget)) {
        matchedCategories.push({ slug: aliasTarget, label });
        seenSlugs.add(aliasTarget);
      }
    }
    for (const [slug, label] of Object.entries(categoryMap)) {
      if (!seenSlugs.has(slug) && (slug.includes(q) || label.toLowerCase().includes(q))) {
        matchedCategories.push({ slug, label });
        seenSlugs.add(slug);
      }
    }

    // 3. Match stores
    const matchedStores = stores
      .filter((s) => s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q))
      .slice(0, 5)
      .map((s) => ({ slug: s.slug, name: s.name, location: s.location }));

    // 4. Product search
    const catSlug = categoryAliases[q] || (categoryKeywords[q] ? q : null);
    let products;

    // Build a word-start-bounded OR regex from category keywords.
    // \m = PostgreSQL word-start boundary, so \mtop matches "top"/"tops" but not "laptop".
    function buildCatRegex(slug: string): string {
      const kws = categoryKeywords[slug].map((k) =>
        k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      );
      return `\\m(${kws.join("|")})`;
    }

    if (catSlug && categoryKeywords[catSlug]) {
      // Single-word category search (e.g. "dress", "top", "bag")
      const catRegex = buildCatRegex(catSlug);
      products = await sql`
        SELECT id, store_slug, store_name, title, price, currency, image, created_at
        FROM products
        WHERE LOWER(title) ~* ${catRegex}
          AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
          AND (created_at IS NULL OR created_at <= NOW() - interval '24 hours')
        ORDER BY created_at DESC NULLS LAST
        LIMIT 50
      `;
    } else {
      const words = q.split(/\s+/).filter((w) => w.length > 0);

      if (words.length > 1) {
        // Check if any word is a category alias (e.g. "black dress" → "dress" → "dresses")
        const catWord = words.find(
          (w) => categoryAliases[w] && categoryKeywords[categoryAliases[w]]
        );

        if (catWord) {
          const targetSlug = categoryAliases[catWord];
          const catRegex = buildCatRegex(targetSlug);
          const modifiers = words.filter((w) => w !== catWord);

          if (modifiers.length === 1) {
            // e.g. "black dress" → category regex + modifier LIKE
            const modPattern = `%${modifiers[0]}%`;
            products = await sql`
              SELECT id, store_slug, store_name, title, price, currency, image, created_at
              FROM products
              WHERE LOWER(title) ~* ${catRegex}
                AND LOWER(title) LIKE ${modPattern}
                AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
                AND (created_at IS NULL OR created_at <= NOW() - interval '24 hours')
              ORDER BY created_at DESC NULLS LAST
              LIMIT 50
            `;
          } else {
            // Multiple modifiers: category constraint only
            products = await sql`
              SELECT id, store_slug, store_name, title, price, currency, image, created_at
              FROM products
              WHERE LOWER(title) ~* ${catRegex}
                AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
                AND (created_at IS NULL OR created_at <= NOW() - interval '24 hours')
              ORDER BY created_at DESC NULLS LAST
              LIMIT 50
            `;
          }
        } else {
          // No category word — AND search with word-start boundaries to avoid
          // partial matches (e.g. "top" matching "laptop")
          const wordPatterns = words.map(
            (w) => `\\m${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
          );
          products = await sql`
            SELECT id, store_slug, store_name, title, price, currency, image, created_at
            FROM products
            WHERE LOWER(title) ~* ALL(${wordPatterns})
              AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
              AND (created_at IS NULL OR created_at <= NOW() - interval '24 hours')
            ORDER BY created_at DESC NULLS LAST
            LIMIT 50
          `;
        }
      } else {
        // Single word: LIKE with exact-start matches ranked first
        const pattern = `%${q}%`;
        const startPattern = `${q}%`;
        products = await sql`
          SELECT id, store_slug, store_name, title, price, currency, image, created_at
          FROM products
          WHERE LOWER(title) LIKE ${pattern}
            AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
            AND (created_at IS NULL OR created_at <= NOW() - interval '24 hours')
          ORDER BY
            CASE WHEN LOWER(title) LIKE ${startPattern} THEN 0 ELSE 1 END,
            created_at DESC NULLS LAST
          LIMIT 50
        `;
      }
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
        price: `$${Math.round(Number(p.price))}`,
        image: p.image,
      })),
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ products: [], designers: [], categories: [], stores: [] }, { status: 500 });
  }
}
