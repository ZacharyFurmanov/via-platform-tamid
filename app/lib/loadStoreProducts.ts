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
    "minaudiere", "minaudière", "wristlet", "baguette", "hobo bag",
    "bucket bag", "fanny pack", "belt bag", "shopper", "luggage",
    "suitcase", "duffel", "evening bag",
  ]],
  // Specific garment types first — these take priority over material keywords
  ["dresses", ["dress", "gown", "kaftan", "caftan", "sundress"]],
  ["skirts", ["skirt", "sarong"]],
  ["shorts", ["shorts"]],
  ["jumpsuits", ["jumpsuit", "romper", "playsuit", "overall", "matching set", "co-ord"]],
  ["coats-jackets", [
    "coat", "jacket", "blazer", "parka", "windbreaker", "puffer",
    "bomber", "trench", "overcoat", "cape", "poncho", "anorak",
    "kimono", "vest", "waistcoat", "gilet", "suit",
  ]],
  ["sweaters", [
    "sweater", "cardigan", "knit", "pullover", "hoodie",
    "sweatshirt", "turtleneck", "crewneck",
  ]],
  ["pants", [
    "pants", "trousers", "chino", "jogger",
    "sweatpant", "wide-leg", "flare", "legging", "culottes",
  ]],
  ["tops", [
    "top", "blouse", "shirt", "tee", "t-shirt", "tank", "cami",
    "bodysuit", "corset", "bustier", "halter", "polo", "henley",
    "tube top", "crop", "tunic",
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
    "belt", "scarf", "stole",
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

export const inferCategoryFromTitle = (title: string): CategorySlug => {
  const t = title.toLowerCase();
  for (const [category, keywords] of categoryKeywords) {
    if (keywords.some((kw) => t.includes(kw))) return category;
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
      if (t.includes(keyword)) {
        return brand.slug;
      }
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
    syncedAt: product.synced_at instanceof Date
      ? product.synced_at.toISOString()
      : String(product.synced_at),
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
