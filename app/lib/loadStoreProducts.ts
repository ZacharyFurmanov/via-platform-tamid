import type { StoreProduct } from "./types";
import type { CategorySlug } from "@/app/lib/categoryMap";
import { getProductsByStore, type DBProduct } from "./db";
import { brands as brandDefs } from "./brandData";

// Keyword → category mapping, checked in order.
// Rule: specific garment-type keywords (skirt, dress, shorts) are checked
// BEFORE material/fabric keywords (denim, jeans) so that e.g. a "Denim Skirt"
// is classified as a skirt, not jeans. Accessories is checked last.
const categoryKeywords: [CategorySlug, string[]][] = [
  ["shoes", [
    "heel", "shoe", "boot", "pump", "sandal", "mule", "clog", "loafer",
    "sneaker", "slipper", "espadrille", "stiletto", "wedge", "oxford",
    "derby", "brogue", "trainer", "slide", "slingback",
    "mary jane", "moccasin",
    "blahnik", "louboutin", "stuart weitzman", "roger vivier",
  ]],
  ["bags", [
    "bag", "clutch", "tote", "purse", "handbag", "pouch",
    "backpack", "rucksack", "satchel", "crossbody", "cross-body",
    "minaudiere", "minaudière", "wristlet", "baguette", "hobo",
    "bucket bag", "fanny pack", "belt bag", "shopper", "luggage",
    "suitcase", "duffel", "duffle", "top handle", "evening bag",
    // LV
    "pochette", "cabas", "musette", "keepall", "speedy", "neverfull",
    "alma", "papillon", "noé", "noe", "deauville", "vanity",
    // Fendi
    "peekaboo", "kan i", "baguette", "first bag", "sunshine",
    // Chanel
    "flap bag", "boy bag", "2.55", "cambon", "gabrielle",
    // Gucci
    "marmont", "dionysus", "bamboo", "ophidia", "horsebit",
    // Prada
    "galleria", "saffiano",
    // Balenciaga
    "city bag", "le cagole",
    // Generic styles without "bag" in name
    "envelope", "frame bag", "chain wallet", "chain bag",
  ]],
  // Specific garment types first — these take priority over material keywords
  ["dresses", ["dress", "gown", "kaftan", "caftan", "sundress", "slip dress", "maxi", "mini dress", "midi dress"]],
  ["skirts", ["skirt", "sarong"]],
  ["shorts", ["shorts"]],
  ["jumpsuits", ["jumpsuit", "romper", "playsuit", "overall", "matching set", "co-ord"]],
  ["coats-jackets", [
    "coat", "jacket", "blazer", "parka", "windbreaker", "puffer",
    "bomber", "trench", "overcoat", "cape", "poncho", "anorak",
    "kimono", "vest", "waistcoat", "gilet", "suit",
  ]],
  ["sweaters", [
    "sweater", "cardigan", "knit", "knitwear", "pullover", "hoodie",
    "sweatshirt", "turtleneck", "crewneck",
  ]],
  ["pants", [
    "pants", "trousers", "chino", "jogger",
    "sweatpant", "wide-leg", "flare", "legging", "culottes",
  ]],
  ["tops", [
    "top", "blouse", "shirt", "tee", "t-shirt", "tank", "cami",
    "bodysuit", "corset", "bustier", "halter", "polo", "henley",
    "tube top", "crop", "tunic", "wrap top", "bralette", "lingerie",
    "slip top", "sheer top",
  ]],
  // Jeans checked after specific garment types so "Denim Skirt" → skirts,
  // not jeans. "jeans" (plural only) avoids matching designer first names
  // like "Jean Paul Gaultier".
  ["jeans", ["jeans", "denim"]],
  // Accessories checked last so clothing keywords always win
  ["accessories", [
    // Jewelry
    "ring", "rings", "necklace", "bracelet", "earring", "pendant",
    "brooch", "charm", "anklet", "bangle", "choker", "locket",
    "signet", "cuff bracelet", "lapel pin", "hair pin",
    "vermeil", "gemstone", "topaz", "sapphire", "diamond",
    "ruby", "emerald", "pearl", "amethyst", "opal", "garnet",
    "turquoise", "onyx",
    // Watches
    "watch",
    // Eyewear
    "sunglasses", "sunglass", "eyewear", "spectacles",
    // Belts & scarves
    "belt", "scarf", "scarves", "stole",
    // Hats & headwear
    "hat", "cap", "beret", "beanie", "headband", "hair clip",
    "barrette", "hair band", "fascinator",
    // Gloves
    "gloves", "mittens",
    // Neckwear
    "necktie", "bow tie", "pocket square",
    // Wallets & small leather goods
    "wallet", "coin purse", "card holder", "cardholder", "keyring", "keychain",
    // Catch-all label
    "jewelry", "jewellery", "accessories",
  ]],
];

// Pre-compile word-boundary patterns once at module load.
// Single-word keywords use \b…(?:s|es)?\b so that:
//   • "top"  matches "Silk Top" / "Silk Tops"  — but NOT "Topaz"
//   • "tote" matches "Leather Tote" / "Canvas Totes" — but NOT "Toteme"
//   • "boot" matches "Ankle Boot" / "Black Boots"
//   • "watch" matches "Vintage Watch" / "Vintage Watches"
// Multi-word keywords (e.g. "tube top", "mary jane") keep substring matching.
function buildPattern(kw: string): RegExp | string {
  if (kw.includes(" ")) return kw;
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}(?:s|es)?\\b`, "i");
}

const compiledCategories: [CategorySlug, Array<RegExp | string>][] =
  categoryKeywords.map(([cat, keywords]) => [
    cat,
    keywords.map(buildPattern),
  ]);

export const inferCategoryFromTitle = (title: string | null | undefined): CategorySlug => {
  if (!title) return "other-clothing";
  for (const [category, patterns] of compiledCategories) {
    if (patterns.some((p) =>
      typeof p === "string" ? title.toLowerCase().includes(p) : p.test(title)
    )) {
      return category;
    }
  }
  // Unrecognized items default to clothing (these are vintage fashion stores)
  return "other-clothing";
};

export const inferItemTypeFromTitle = (title: string): string | null => {
  const t = title.toLowerCase();
  const types = [
    "jacket", "coat", "blazer", "dress", "skirt", "pants", "trousers",
    "jeans", "blouse", "shirt", "sweater", "cardigan", "vest", "suit",
    "jumpsuit", "romper", "shorts", "cape", "poncho", "boot", "heel",
    "sandal", "sneaker", "bag", "clutch", "tote", "top",
  ];
  for (const type of types) {
    if (t.includes(type)) return type;
  }
  return null;
};

export const inferColorFromTitle = (title: string): string | null => {
  const t = title.toLowerCase();
  const colors = [
    "multicolor", "burgundy", "maroon", "navy", "cream", "beige",
    "ivory", "coral", "teal", "khaki", "camel", "olive", "silver",
    "gold", "orange", "yellow", "purple", "brown", "green", "pink",
    "grey", "gray", "black", "white", "red", "blue", "tan",
  ];
  for (const color of colors) {
    if (t.includes(color)) return color;
  }
  return null;
};

export const inferBrandFromTitle = (title: string): string | null => {
  const t = title.toLowerCase();
  for (const brand of brandDefs) {
    for (const keyword of brand.keywords) {
      const matches =
        keyword.length <= 3
          ? new RegExp(`(?<![a-z])${keyword}(?![a-z])`).test(t)
          : t.includes(keyword);
      if (matches) return brand.slug;
    }
  }
  return null;
};

// Parse images JSON from DB, falling back to single image
function parseImages(product: DBProduct): string[] {
  if (product.images) {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  return product.image ? [product.image] : [];
}

// Transform database product to StoreProduct format
function transformDBProduct(product: DBProduct): StoreProduct {
  const priceString = `$${Math.round(Number(product.price))}`;

  return {
    id: `${product.store_slug}-${product.id}`,
    name: product.title,
    price: priceString,
    category: inferCategoryFromTitle(product.title),
    storeSlug: product.store_slug,
    externalUrl: product.external_url ?? undefined,
    image: product.image ?? undefined,
    images: parseImages(product),
    size: product.size ?? null,
    syncedAt: product.synced_at instanceof Date
      ? product.synced_at.toISOString()
      : String(product.synced_at),
    createdAt: product.created_at instanceof Date
      ? product.created_at.toISOString()
      : product.created_at
        ? String(product.created_at)
        : undefined,
  };
}

/**
 * Load products for a specific store from the database
 */
export async function loadStoreProducts(storeSlug: string): Promise<StoreProduct[]> {
  try {
    const products = await getProductsByStore(storeSlug);
    return products.map(transformDBProduct);
  } catch (error) {
    console.error(`Failed to load products for store ${storeSlug}:`, error);
    return [];
  }
}
