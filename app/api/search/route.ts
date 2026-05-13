import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { stores } from "@/app/lib/stores";
import { brands } from "@/app/lib/brandData";
import { categoryMap } from "@/app/lib/categoryMap";
import { DISABLED_STORE_SLUGS } from "@/app/lib/db";
import { formatPrice } from "@/app/lib/formatPrice";

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is not set.");
  return url;
};

const STOP_WORDS = new Set([
  "and", "or", "the", "a", "an", "in", "of", "for", "with", "by",
  "de", "et", "le", "la", "von", "van", "&",
]);

// Common search terms → internal category slug (used for quick-link chips only)
const categoryAliases: Record<string, string> = {
  bag: "bags", pouch: "bags", clutch: "bags", tote: "bags", purse: "bags",
  backpack: "bags", satchel: "bags", crossbody: "bags", handbag: "bags",
  shoe: "shoes", shoes: "shoes", boot: "shoes", boots: "shoes",
  bootie: "shoes", booties: "shoes", heel: "shoes", heels: "shoes",
  pump: "shoes", pumps: "shoes", flat: "shoes", flats: "shoes",
  sneaker: "shoes", sneakers: "shoes", trainer: "shoes", trainers: "shoes",
  sandal: "shoes", sandals: "shoes", mule: "shoes", mules: "shoes",
  clog: "shoes", clogs: "shoes", loafer: "shoes", loafers: "shoes",
  wedge: "shoes", wedges: "shoes", slipper: "shoes", slippers: "shoes",
  espadrille: "shoes", espadrilles: "shoes",
  clothing: "clothing", clothes: "clothing",
  top: "tops", tops: "tops", shirt: "tops", shirts: "tops",
  blouse: "tops", blouses: "tops", bodysuit: "tops", bodysuits: "tops",
  cami: "tops", camisole: "tops", halter: "tops", tank: "tops",
  dress: "dresses", dresses: "dresses", gown: "dresses", gowns: "dresses",
  jacket: "coats-jackets", jackets: "coats-jackets",
  coat: "coats-jackets", coats: "coats-jackets",
  blazer: "coats-jackets", blazers: "coats-jackets",
  trench: "coats-jackets", parka: "coats-jackets",
  puffer: "coats-jackets", fur: "coats-jackets",
  pants: "pants", trouser: "pants", trousers: "pants",
  legging: "pants", leggings: "pants", culotte: "pants", culottes: "pants",
  jean: "jeans", jeans: "jeans", denim: "jeans",
  skirt: "skirts", skirts: "skirts",
  sweater: "sweaters", sweaters: "sweaters",
  cardigan: "sweaters", cardigans: "sweaters",
  hoodie: "sweaters", hoodies: "sweaters",
  pullover: "sweaters", knitwear: "sweaters",
  turtleneck: "sweaters", crewneck: "sweaters",
  short: "shorts", shorts: "shorts",
  jumpsuit: "jumpsuits", jumpsuits: "jumpsuits",
  romper: "jumpsuits", rompers: "jumpsuits",
  overall: "jumpsuits", overalls: "jumpsuits", playsuit: "jumpsuits",
  accessory: "accessories", accessories: "accessories",
  hat: "accessories", hats: "accessories", cap: "accessories", caps: "accessories",
  jewelry: "jewelry", jewellery: "jewelry",
  ring: "jewelry", rings: "jewelry",
  necklace: "jewelry", necklaces: "jewelry",
  bracelet: "jewelry", bracelets: "jewelry",
  earring: "jewelry", earrings: "jewelry",
  brooch: "jewelry", brooches: "jewelry",
  bangle: "jewelry", bangles: "jewelry",
  pendant: "jewelry", pendants: "jewelry",
  choker: "jewelry", anklet: "jewelry",
  belt: "belts", belts: "belts",
  scarf: "scarves", scarves: "scarves",
  shawl: "scarves", wrap: "scarves", stole: "scarves",
  sunglasses: "sunglasses", sunglass: "sunglasses",
  watch: "watches", watches: "watches",
  headpiece: "headpieces", headpieces: "headpieces",
  headband: "headpieces", fascinator: "headpieces", tiara: "headpieces",
  home: "home", decor: "home",
  wallet: "wallets", wallets: "wallets",
  cardholder: "wallets",
};

// Strip accents/diacritics so "chloe" matches "Chloé", "rene" matches "René", etc.
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Strip stop words and punctuation, return meaningful search tokens
function parseWords(q: string): string[] {
  const all = q
    .split(/[\s&]+/)
    .map(w => w.replace(/[.,!?'"()]/g, "").trim())
    .filter(w => w.length > 1);
  const meaningful = all.filter(w => !STOP_WORDS.has(w));
  return meaningful.length > 0 ? meaningful : all;
}

// Sanitize for plainto_tsquery — strips chars that could cause parse errors
function toSafeTsQuery(q: string): string {
  return q.replace(/[^\w\s'\-]/g, " ").replace(/\s+/g, " ").trim();
}

// Returns the best-matching brand for this query, or null
function detectBrand(q: string, words: string[]): (typeof brands)[0] | null {
  // Exact keyword match
  for (const b of brands) {
    if (b.keywords.some(kw => q === kw)) return b;
  }
  // Query contains a brand keyword (e.g. "chanel bag" contains "chanel")
  for (const b of brands) {
    if (b.keywords.some(kw => kw.length > 3 && q.includes(kw))) return b;
  }
  // All significant words in query appear in a brand label ("dolce gabbana")
  if (words.length > 1) {
    for (const b of brands) {
      const bLabel = b.label.toLowerCase();
      if (words.every(w => bLabel.includes(w))) return b;
    }
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQ = searchParams.get("q")?.trim() ?? "";
  // Normalize: lowercase + strip accents so "chloe" matches "Chloé"
  const q = stripAccents(rawQ.toLowerCase());

  if (!q || q.length < 2) {
    return NextResponse.json({ products: [], designers: [], categories: [], stores: [] });
  }

  try {
    const sql = neon(getDatabaseUrl());

    // Ensure unaccent extension is available (standard PostgreSQL contrib, no-op if already installed)
    sql`CREATE EXTENSION IF NOT EXISTS unaccent`.catch(() => {});

    // ── 1. Parse query into tokens ────────────────────────────────────────────
    const words = parseWords(q);
    const phrasePattern = `%${q}%`;
    const startPattern = `${q}%`;
    const wordPatterns = words.map(w => `%${w}%`);
    // plainto_tsquery-safe version of the query
    const safeQ = toSafeTsQuery(q) || words.join(" ") || q;

    // ── 2. Brand detection ────────────────────────────────────────────────────
    // When a brand is identified, use its primary keyword to search the
    // product_type column (Shopify's brand/designer field). This surfaces
    // products whose title doesn't mention the brand (e.g. title = "Mini Flap",
    // product_type = "Chanel").
    const detectedBrand = detectBrand(q, words);
    const brandPtPattern = detectedBrand
      ? `%${detectedBrand.keywords[0]}%`
      : phrasePattern;

    // ── 3. Quick-links: designers, categories, stores ─────────────────────────
    const matchedDesigners = brands
      .filter(b => {
        const bLabel = stripAccents(b.label.toLowerCase());
        if (bLabel.includes(q)) return true;
        if (b.keywords.some(kw => kw.includes(q) || q.includes(kw))) return true;
        if (words.length > 1 && words.every(w => bLabel.includes(w))) return true;
        return false;
      })
      .slice(0, 5)
      .map(b => ({ slug: b.slug, label: b.label }));

    // Show category chips for the full query AND for any individual word
    // (so "leather dress" shows a Dresses chip, not just "leather dress" → nothing)
    const matchedCategories: { slug: string; label: string }[] = [];
    const seenCatSlugs = new Set<string>();
    const addCatChip = (slug: string) => {
      if (seenCatSlugs.has(slug)) return;
      const label = categoryMap[slug as keyof typeof categoryMap];
      if (label) { matchedCategories.push({ slug, label }); seenCatSlugs.add(slug); }
    };

    const aliasTarget = categoryAliases[q];
    if (aliasTarget) addCatChip(aliasTarget);
    for (const w of words) {
      const wAlias = categoryAliases[w];
      if (wAlias) addCatChip(wAlias);
    }
    for (const [slug, label] of Object.entries(categoryMap)) {
      if (!seenCatSlugs.has(slug) && (slug.includes(q) || label.toLowerCase().includes(q))) {
        matchedCategories.push({ slug, label });
        seenCatSlugs.add(slug);
      }
    }

    const matchedStores = stores
      .filter(s => s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q))
      .slice(0, 5)
      .map(s => ({ slug: s.slug, name: s.name, location: s.location }));

    // ── 4. Main product search — unified relevance scoring ────────────────────
    //
    // Every candidate gets a composite relevance score. Higher = better match.
    //
    //   10 000  exact title match ("chanel" → "Chanel")
    //    5 000  title starts with query
    //    2 000  title contains exact phrase
    //    0–1000 FTS ts_rank — handles word forms, plurals, stemming
    //      500  all search words present in title
    //      800  product_type (Shopify brand field) matches brand keyword
    //      120  description contains the phrase
    //     0–30  recency bonus (max for today's listings, decays over ~30 days)
    //
    // WHERE casts a wide net (OR); ORDER BY score filters it to the best matches.
    //
    const products = await sql`
      WITH scored AS (
        SELECT
          id, store_slug, store_name, title, price, currency, image, images, created_at,
          (
            CASE WHEN unaccent(LOWER(title)) = ${q}               THEN 10000 ELSE 0 END
            + CASE WHEN unaccent(LOWER(title)) LIKE ${startPattern}  THEN  5000 ELSE 0 END
            + CASE WHEN unaccent(LOWER(title)) LIKE ${phrasePattern}  THEN  2000 ELSE 0 END
            + FLOOR(
                ts_rank(
                  setweight(to_tsvector('english', unaccent(COALESCE(title, ''))), 'A'),
                  plainto_tsquery('english', unaccent(${safeQ}))
                ) * 1000
              )::int
            + CASE WHEN unaccent(LOWER(title)) LIKE ALL(${wordPatterns}) THEN 500 ELSE 0 END
            + CASE
                WHEN product_type IS NOT NULL
                     AND LOWER(product_type) LIKE ${brandPtPattern}
                THEN 800
                ELSE 0
              END
            + CASE
                WHEN description IS NOT NULL
                     AND unaccent(LOWER(description)) LIKE ${phrasePattern}
                THEN 120
                ELSE 0
              END
            + GREATEST(0, 30 - FLOOR(
                EXTRACT(EPOCH FROM (NOW() - COALESCE(created_at, NOW()))) / 86400.0
              ))::int
          ) AS relevance
        FROM products
        WHERE
          (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
          AND (${DISABLED_STORE_SLUGS.length} = 0 OR store_slug != ALL(${DISABLED_STORE_SLUGS}))
          AND (
            unaccent(LOWER(title)) LIKE ${phrasePattern}
            OR unaccent(LOWER(title)) LIKE ANY(${wordPatterns})
            OR to_tsvector('english', unaccent(COALESCE(title, '')))
               @@ plainto_tsquery('english', unaccent(${safeQ}))
            OR (product_type IS NOT NULL
                AND LOWER(product_type) LIKE ${brandPtPattern})
            OR (description IS NOT NULL
                AND unaccent(LOWER(description)) LIKE ${phrasePattern})
          )
      )
      SELECT * FROM scored WHERE relevance > 0
      ORDER BY relevance DESC, created_at DESC NULLS LAST
      LIMIT 200
    `;

    // ── 5. Fuzzy trigram fallback for typos ───────────────────────────────────
    // Triggered when the main search returns fewer than 5 results.
    // Uses pg_trgm similarity to catch misspellings ("chanell" → Chanel items).
    // Silently skipped if pg_trgm extension isn't installed.
    let allProducts = products as Array<Record<string, unknown>>;
    if (allProducts.length < 5 && words.length > 0) {
      // Use the longest word as the anchor for fuzzy matching
      const anchor = words.reduce((a, b) => (a.length >= b.length ? a : b));
      try {
        const fuzzy = await sql`
          SELECT id, store_slug, store_name, title, price, currency, image, images, created_at
          FROM products
          WHERE
            (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
            AND (${DISABLED_STORE_SLUGS.length} = 0 OR store_slug != ALL(${DISABLED_STORE_SLUGS}))
            AND similarity(unaccent(LOWER(title)), ${anchor}) > 0.25
          ORDER BY similarity(unaccent(LOWER(title)), ${anchor}) DESC, created_at DESC NULLS LAST
          LIMIT 50
        `;
        const existingIds = new Set(allProducts.map(p => p.id));
        allProducts = [
          ...allProducts,
          ...fuzzy.filter((p: Record<string, unknown>) => !existingIds.has(p.id)),
        ];
      } catch {
        // pg_trgm not available — graceful no-op
      }
    }

    // Fire-and-forget: log the search term for analytics
    sql`
      CREATE TABLE IF NOT EXISTS searches (
        id SERIAL PRIMARY KEY,
        query TEXT NOT NULL,
        results_count INT NOT NULL DEFAULT 0,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `.then(() =>
      sql`INSERT INTO searches (query, results_count) VALUES (${q}, ${allProducts.length})`
    ).catch(() => {});

    return NextResponse.json({
      designers: matchedDesigners,
      categories: matchedCategories,
      stores: matchedStores,
      products: allProducts.map(p => {
        let parsedImages: string[] | undefined;
        try {
          parsedImages = p.images ? JSON.parse(p.images as string) : undefined;
        } catch {
          // malformed JSON — skip
        }
        return {
          id: p.id,
          name: p.title,
          storeSlug: p.store_slug,
          storeName: p.store_name,
          price: formatPrice(Number(p.price), p.currency as string | null),
          image: p.image,
          images: parsedImages,
        };
      }),
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { products: [], designers: [], categories: [], stores: [] },
      { status: 500 }
    );
  }
}
