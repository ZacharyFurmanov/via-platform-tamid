import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { stores } from "@/app/lib/stores";
import { brands } from "@/app/lib/brandData";
import { categoryMap } from "@/app/lib/categoryMap";
import { getDb } from "@/app/lib/firebase-db";

// Words stripped from multi-word queries before AND-matching.
// Prevents "dolce AND gabbana" from requiring literal "and" in product titles.
const STOP_WORDS = new Set([
  "and", "or", "the", "a", "an", "in", "of", "for", "with", "by",
  "de", "et", "le", "la", "von", "van", "&",
]);

// Aliases: common search terms → internal category slug
const categoryAliases: Record<string, string> = {
  // bags
  bag: "bags", pouch: "bags", clutch: "bags", tote: "bags", purse: "bags",
  backpack: "bags", satchel: "bags", crossbody: "bags", handbag: "bags",
  // shoes
  shoe: "shoes", shoes: "shoes", boot: "shoes", boots: "shoes",
  bootie: "shoes", booties: "shoes", heel: "shoes", heels: "shoes",
  pump: "shoes", pumps: "shoes", flat: "shoes", flats: "shoes",
  sneaker: "shoes", sneakers: "shoes", trainer: "shoes", trainers: "shoes",
  sandal: "shoes", sandals: "shoes", mule: "shoes", mules: "shoes",
  clog: "shoes", clogs: "shoes", loafer: "shoes", loafers: "shoes",
  wedge: "shoes", wedges: "shoes", slipper: "shoes", slippers: "shoes",
  espadrille: "shoes", espadrilles: "shoes",
  // clothing
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
  // accessories (generic)
  accessory: "accessories", accessories: "accessories",
  hat: "accessories", hats: "accessories", cap: "accessories", caps: "accessories",
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
  shawl: "scarves", wrap: "scarves", stole: "scarves",
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

// Category slug → product title keywords used in DB regex search
const categoryKeywords: Record<string, string[]> = {
  bags: ["bag", "clutch", "tote", "purse", "handbag", "pouch", "backpack", "rucksack", "satchel", "crossbody", "wristlet", "minaudiere"],
  shoes: ["heel", "shoe", "boot", "pump", "sandal", "mule", "clog", "loafer", "sneaker", "slipper", "espadrille", "stiletto", "wedge", "oxford", "derby", "brogue", "trainer", "slide", "slingback", "mary jane", "moccasin", "flat", "bootie"],
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
  dresses: ["dress", "gown", "kaftan", "sundress", "minidress"],
  "coats-jackets": ["coat", "jacket", "blazer", "parka", "windbreaker", "puffer", "bomber", "trench", "overcoat", "cape", "poncho", "anorak", "kimono", "vest", "suit", "fur"],
  sweaters: ["sweater", "cardigan", "knit", "pullover", "hoodie", "sweatshirt", "turtleneck", "crewneck"],
  jeans: ["jeans", "denim"],
  pants: ["pants", "trousers", "chino", "jogger", "legging", "culottes"],
  skirts: ["skirt", "sarong"],
  shorts: ["shorts"],
  jumpsuits: ["jumpsuit", "romper", "playsuit", "overall", "matching set"],
  wallets: ["wallet", "coin purse", "card holder", "cardholder", "billfold", "card case"],
};

type SearchProduct = {
  id: number;
  store_slug: string;
  store_name: string;
  title: string;
  price: number;
  currency: string;
  image: string | null;
  created_at: string | null;
  shopify_product_id: string | null;
  collabs_link: string | null;
};

// Build a word-start-bounded OR regex for a category slug.
function buildCatRegex(slug: string): RegExp {
  const kws = categoryKeywords[slug].map((k) =>
    k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  return new RegExp(`\\b(${kws.join("|")})`, "i");
}

function createdAtScore(product: SearchProduct): number {
  if (!product.created_at) return -1;
  const parsed = Date.parse(product.created_at);
  return Number.isNaN(parsed) ? -1 : parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase();

  if (!q || q.length < 2) {
    return NextResponse.json({ products: [], designers: [], categories: [], stores: [] });
  }

  try {
    // ─── 1. Designer / brand matching ────────────────────────────────────────
    // Strip stop words and "&" for word-level brand matching
    // so "dolce and gabbana" → ["dolce", "gabbana"] matches "Dolce & Gabbana"
    const qSignificantWords = q
      .split(/[\s&]+/)
      .map((w) => w.replace(/[.,!?]/g, ""))
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

    const matchedDesigners = brands
      .filter((b) => {
        const bLabel = b.label.toLowerCase();
        if (bLabel.includes(q)) return true;
        if (b.keywords.some((kw) => kw.includes(q) || q.includes(kw))) return true;
        // All significant words in query appear in brand label (handles "and" vs "&")
        if (
          qSignificantWords.length > 1 &&
          qSignificantWords.every((w) => bLabel.includes(w))
        ) return true;
        return false;
      })
      .slice(0, 5)
      .map((b) => ({ slug: b.slug, label: b.label }));

    // ─── 2. Category quick-links ──────────────────────────────────────────────
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

    // ─── 3. Store matching ────────────────────────────────────────────────────
    const matchedStores = stores
      .filter((s) => s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q))
      .slice(0, 5)
      .map((s) => ({ slug: s.slug, name: s.name, location: s.location }));

    // ─── 4. Product search ────────────────────────────────────────────────────
    // Note: the 24h VIA Insider filter is intentionally NOT applied here.
    // Browse All / category pages use it; explicit search always returns results.
    const productSnaps = await getDocs(collection(getDb(), "products"));
    const allProducts = productSnaps.docs
      .map((snap) => snap.data() as Partial<SearchProduct>)
      .filter(
        (p): p is SearchProduct =>
          typeof p.id === "number" &&
          typeof p.store_slug === "string" &&
          typeof p.store_name === "string" &&
          typeof p.title === "string" &&
          typeof p.price === "number"
      )
      .filter((p) => !(p.shopify_product_id && !p.collabs_link));

    // Resolve query to a category slug if it matches an alias or is a known slug
    const catSlug = categoryAliases[q] || (categoryKeywords[q] ? q : null);
    let products: SearchProduct[] = [];

    if (catSlug && categoryKeywords[catSlug]) {
      // ── Single-word category search: "dress", "shoes", "bag", "jewelry" ───
      const catRegex = buildCatRegex(catSlug);
      products = allProducts
        .filter((p) => catRegex.test(p.title.toLowerCase()))
        .sort((a, b) => createdAtScore(b) - createdAtScore(a))
        .slice(0, 50);
    } else {
      // Strip stop words so "dolce and gabbana" → ["dolce","gabbana"]
      const allWords = q.split(/\s+/).filter((w) => w.length > 1);
      const searchWords = allWords.filter((w) => !STOP_WORDS.has(w));
      const words = searchWords.length > 0 ? searchWords : allWords;

      if (words.length > 1) {
        // Check if any word is a category alias ("black dress" → catWord = "dress")
        const catWord = words.find(
          (w) => categoryAliases[w] && categoryKeywords[categoryAliases[w]]
        );

        if (catWord) {
          // ── Category + modifiers: "vintage chanel bag", "silk dress", "leather jacket" ──
          const targetSlug = categoryAliases[catWord];
          const catRegex = buildCatRegex(targetSlug);
          const modifiers = words.filter((w) => w !== catWord);
          products = allProducts
            .filter((p) => catRegex.test(p.title.toLowerCase()))
            .filter((p) => modifiers.every((m) => p.title.toLowerCase().includes(m)))
            .sort((a, b) => createdAtScore(b) - createdAtScore(a))
            .slice(0, 50);

          // Fallback: category only if modifiers too specific (e.g. rare brand + category)
          if (!products.length) {
            products = allProducts
              .filter((p) => catRegex.test(p.title.toLowerCase()))
              .sort((a, b) => createdAtScore(b) - createdAtScore(a))
              .slice(0, 50);
          }
        } else {
          // ── No category word: "dolce gabbana", "ralph lauren", "vintage sequin" ──
          // AND match: all words must appear as substrings in title
          products = allProducts
            .filter((p) => words.every((w) => p.title.toLowerCase().includes(w)))
            .sort((a, b) => createdAtScore(b) - createdAtScore(a))
            .slice(0, 50);

          // Fallback: any word matches (OR), ranked by how many words match
          if (!products.length) {
            products = allProducts
              .filter((p) => words.some((w) => p.title.toLowerCase().includes(w)))
              .sort((a, b) => {
                const aHits = words.filter((w) => a.title.toLowerCase().includes(w)).length;
                const bHits = words.filter((w) => b.title.toLowerCase().includes(w)).length;
                if (aHits !== bHits) return bHits - aHits;
                return createdAtScore(b) - createdAtScore(a);
              })
              .slice(0, 50);
          }
        }
      } else {
        // ── Single non-category word: partial match, start-anchored results first ──
        const singleWord = words[0] ?? q;
        products = allProducts
          .filter((p) => p.title.toLowerCase().includes(singleWord))
          .sort((a, b) => {
            const aStarts = a.title.toLowerCase().startsWith(singleWord);
            const bStarts = b.title.toLowerCase().startsWith(singleWord);
            if (aStarts !== bStarts) return aStarts ? -1 : 1;
            return createdAtScore(b) - createdAtScore(a);
          })
          .slice(0, 50);
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
