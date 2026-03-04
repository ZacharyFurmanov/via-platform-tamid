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

// Words to strip from multi-word queries before building AND-match patterns.
// "dolce and gabbana" → ["dolce", "gabbana"] so "&" vs "and" doesn't break brand searches.
const STOP_WORDS = new Set([
  "and", "or", "the", "a", "an", "in", "of", "for", "with", "by", "de", "et", "le", "la", "von",
]);

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
  // accessories (generic)
  accessory: "accessories", accessories: "accessories",
  hat: "accessories", hats: "accessories",
  // jewelry
  jewelry: "jewelry", jewellery: "jewelry",
  ring: "jewelry", rings: "jewelry",
  necklace: "jewelry", necklaces: "jewelry",
  bracelet: "jewelry", bracelets: "jewelry",
  earring: "jewelry", earrings: "jewelry",
  brooch: "jewelry", brooches: "jewelry",
  bangle: "jewelry", bangles: "jewelry",
  pendant: "jewelry", pendants: "jewelry",
  choker: "jewelry", anklet: "jewelry",
  // belts
  belt: "belts", belts: "belts",
  // scarves
  scarf: "scarves", scarves: "scarves",
  shawl: "scarves", wrap: "scarves",
  // sunglasses
  sunglasses: "sunglasses", sunglass: "sunglasses",
  // watches
  watch: "watches", watches: "watches",
  // headpieces
  headpiece: "headpieces", headpieces: "headpieces",
  headband: "headpieces", fascinator: "headpieces", tiara: "headpieces",
  // home
  home: "home", decor: "home",
  // wallets
  wallet: "wallets", wallets: "wallets",
  "coin purse": "wallets", cardholder: "wallets", "card holder": "wallets",
};

// Category slug → title keywords for DB search
const categoryKeywords: Record<string, string[]> = {
  bags: ["bag", "clutch", "tote", "purse", "handbag", "pouch", "backpack", "rucksack", "satchel", "crossbody", "wristlet", "minaudiere"],
  shoes: ["heel", "shoe", "boot", "pump", "sandal", "mule", "clog", "loafer", "sneaker", "slipper", "espadrille", "stiletto", "wedge", "oxford", "derby", "brogue", "trainer", "slide", "slingback", "mary jane", "moccasin"],
  accessories: ["belt", "scarf", "hat", "sunglass", "necklace", "bracelet", "earring", "watch", "ring", "brooch", "pendant", "bangle", "choker", "anklet", "jewelry", "jewel"],
  jewelry: ["necklace", "bracelet", "earring", "ring", "brooch", "pendant", "bangle", "choker", "anklet", "locket", "cameo", "jewel", "gemstone", "pearl", "charm", "cuff", "stud", "pin", "jewellery"],
  belts: ["belt"],
  scarves: ["scarf", "shawl", "stole", "wrap", "pashmina", "bandana"],
  sunglasses: ["sunglass", "eyewear", "eyeglasses"],
  watches: ["watch", "timepiece"],
  headpieces: ["headpiece", "headband", "barrette", "hairpin", "fascinator", "tiara", "hair clip", "hair bow", "hair comb", "hair slide", "scrunchie", "hair pin"],
  home: ["vase", "plate", "cup", "mug", "bowl", "pitcher", "dish", "candle", "book", "figurine", "sculpture", "lamp", "mirror", "tray", "blanket", "pillow", "cushion", "ceramic", "pottery", "platter", "tumbler", "glassware", "kitchenware", "tableware", "decor", "frame", "basket", "textile", "linen", "napkin", "teapot", "carafe", "ashtray", "inkwell"],
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
    // Also handle "dolce and gabbana" → matches "Dolce & Gabbana" by checking significant words
    const qSignificantWords = q.split(/[\s&]+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w));
    const matchedDesigners = brands
      .filter((b) => {
        const bLabel = b.label.toLowerCase();
        if (bLabel.includes(q)) return true;
        if (b.keywords.some((kw) => kw.includes(q) || q.includes(kw))) return true;
        // Match if all significant query words appear in the brand label (handles "and" vs "&")
        if (qSignificantWords.length > 1 && qSignificantWords.every((w) => bLabel.includes(w))) return true;
        return false;
      })
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
      // Search bypasses the 24h Insider filter — explicit lookups should always find items.
      const catRegex = buildCatRegex(catSlug);
      products = await sql`
        SELECT id, store_slug, store_name, title, price, currency, image, created_at
        FROM products
        WHERE LOWER(title) ~* ${catRegex}
          AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
        ORDER BY created_at DESC NULLS LAST
        LIMIT 50
      `;
    } else {
      // Strip stop words so "dolce and gabbana" → ["dolce", "gabbana"]
      const allWords = q.split(/\s+/).filter((w) => w.length > 0);
      const words = allWords.filter((w) => !STOP_WORDS.has(w));
      const searchWords = words.length > 0 ? words : allWords; // fallback if all stop words

      if (searchWords.length > 1) {
        // Check if any word is a category alias (e.g. "black dress" → "dress" → "dresses")
        const catWord = searchWords.find(
          (w) => categoryAliases[w] && categoryKeywords[categoryAliases[w]]
        );

        if (catWord) {
          const targetSlug = categoryAliases[catWord];
          const catRegex = buildCatRegex(targetSlug);
          const modifiers = searchWords.filter((w) => w !== catWord);

          if (modifiers.length === 1) {
            // e.g. "black dress" → category regex + modifier LIKE
            const modPattern = `%${modifiers[0]}%`;
            products = await sql`
              SELECT id, store_slug, store_name, title, price, currency, image, created_at
              FROM products
              WHERE LOWER(title) ~* ${catRegex}
                AND LOWER(title) LIKE ${modPattern}
                AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
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
              ORDER BY created_at DESC NULLS LAST
              LIMIT 50
            `;
          }
        } else {
          // No category word — AND search with word-start boundaries
          // Stop words already stripped, so "dolce and gabbana" → matches "Dolce & Gabbana ..."
          const wordPatterns = searchWords.map(
            (w) => `\\m${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
          );
          products = await sql`
            SELECT id, store_slug, store_name, title, price, currency, image, created_at
            FROM products
            WHERE LOWER(title) ~* ALL(${wordPatterns})
              AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
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
