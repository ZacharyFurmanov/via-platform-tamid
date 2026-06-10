import type { StoreProduct } from "./types";
import type { CategorySlug } from "@/app/lib/categoryMap";
import { getProductsByStore, type DBProduct } from "./db";
import { brands as brandDefs } from "./brandData";
import { deriveDisplaySize } from "./inventory";

// Keyword → category mapping, checked in order.
// Rule: specific garment-type keywords (skirt, dress, shorts) are checked
// BEFORE material/fabric keywords (denim, jeans) so that e.g. a "Denim Skirt"
// is classified as a skirt, not jeans. Accessories is checked last.
const categoryKeywords: [CategorySlug, string[]][] = [
 // Compound overrides — checked first to prevent single-word false positives.
 // e.g. "Beaded Dress Pants" should be pants, not dresses.
 ["pants", ["dress pants", "dress pant", "slacks"]],
 ["skirts", ["skirt suit", "mini skirt", "midi skirt", "maxi skirt"]],
 ["jumpsuits", ["shirt dress jumpsuit", "dress jumpsuit"]],
 // Compound shoe overrides — must precede single-word shoe rules
 ["flats", ["ballet flat", "ballerina flat", "ballet flats", "flat shoe"]],
 ["boots", ["flat boot", "ankle boot", "knee-high boot", "thigh-high boot", "chelsea boot", "combat boot", "cowboy boot"]],
 ["sandals", ["wedge sandal", "thong sandal"]],
 ["heels", ["wedge heel", "kitten heel", "block heel", "cone heel"]],
 // Jewelry NOUNS checked first — an earring/necklace/ring title should never be
 // misclassified as bags or clothing even if it shares a designer keyword.
 // NOTE: gemstone/material words (ruby, emerald, pearl…) are intentionally NOT
 // here — they double as colors ("ruby red", "pearl white") and are checked
 // later (see "jewelry — gemstone" block below) so they don't steal shoes/bags.
 ["jewelry", [
 "earring", "necklace", "bracelet", "pendant",
 "brooch", "bangle", "choker", "locket", "cuff bracelet", "anklet",
 "ring", "rings", "signet", "lapel pin",
 "charm bracelet",
 "jewelry", "jewellery",
 ]],
 // Shoe subcategories — checked before the generic "shoes" catch-all
 ["boots", ["boot", "bootie"]],
 ["heels", ["heel", "pump", "stiletto", "wedge", "blahnik", "louboutin", "roger vivier"]],
 ["sneakers", ["sneaker", "trainer"]],
 ["sandals", ["sandal", "espadrille", "slide", "slingback"]],
 ["flats", [
 "loafer", "mule", "clog", "oxford", "derby", "brogue",
 "mary jane", "moccasin", "slipper",
 ]],
 // "shoes" / "flat" (adj) / designer catch-all for shoes that don't fit above
 ["shoes", ["shoe", "footwear", "stuart weitzman"]],
 // Bag subcategories — checked before the generic "bags" catch-all
 ["totes", ["tote", "shopper", "neverfull", "cabas"]],
 ["clutches", ["clutch", "minaudiere", "minaudière", "wristlet", "evening bag", "envelope"]],
 ["crossbody-bags", ["crossbody", "cross-body", "satchel", "belt bag", "fanny pack"]],
 ["handbags", [
 "handbag", "purse", "hobo", "baguette", "bucket bag",
 "top handle", "chain bag", "frame bag",
 // LV
 "pochette", "musette", "keepall", "speedy", "alma", "papillon", "noé", "noe", "deauville", "vanity",
 // Fendi
 "peekaboo", "kan i", "first bag", "sunshine",
 // Chanel
 "flap bag", "boy bag", "2.55", "cambon", "gabrielle",
 // Gucci
 "marmont", "dionysus", "bamboo", "ophidia", "horsebit",
 // Prada
 "galleria", "saffiano",
 // Balenciaga
 "city bag", "le cagole",
 ]],
 // "bags" catch-all — "bag", "pouch", "backpack", etc. that don't fit above
 ["bags", ["bag", "pouch", "backpack", "rucksack", "luggage", "suitcase", "duffel", "duffle", "chain wallet"]],
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
 "pants", "trousers", "chino", "jogger", "slacks",
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
 // Home & lifestyle — checked before accessories so "vase", "candle", etc. don't fall through
 ["home", [
 "book", "plate", "dish", "cup", "mug", "bowl", "vase", "candle", "candlestick",
 "pitcher", "jug", "teapot", "tea set", "coffee set", "carafe",
 "tablecloth", "napkin", "placemat", "tray", "serving bowl", "salad bowl",
 "wine glass", "champagne flute", "tumbler", "decanter",
 "ornament", "figurine", "sculpture", "picture frame", "photo frame",
 "lamp", "lantern", "cushion", "throw pillow", "blanket",
 "cutting board", "cheese board", "soap dish", "diffuser",
 "trinket", "trinket dish", "ashtray",
 ]],
 // Jewelry — gemstone/material words. Checked AFTER garment/shoe/bag nouns
 // because they're commonly used as colors ("ruby red mules", "emerald green
 // dress", "pearl white sandals"). A gemstone-only title (e.g. "Art Deco Sapphire
 // Clip") still lands here as jewelry rather than falling through to accessories.
 ["jewelry", [
 "vermeil", "gemstone", "topaz", "sapphire", "diamond",
 "ruby", "emerald", "pearl", "amethyst", "opal", "garnet",
 "turquoise", "onyx",
 ]],
 // Accessory subcategories checked before generic "accessories" catch-all
 ["sunglasses", ["sunglasses", "sunglass", "eyewear", "spectacles"]],
 ["belts", ["belt"]],
 ["scarves", ["scarf", "scarves", "stole", "shawl"]],
 ["hats", ["hat", "cap", "beret", "beanie", "headband", "hair clip", "barrette", "hair band", "fascinator"]],
 // "accessories" catch-all for watches, wallets, gloves, neckwear, and everything else
 ["accessories", [
 "watch",
 "wallet", "coin purse", "card holder", "cardholder", "keyring", "keychain",
 "gloves", "mittens",
 "necktie", "bow tie", "pocket square",
 "hair pin", "charm", "signet",
 "accessories",
 ]],
];

// Pre-compile word-boundary patterns once at module load.
// Single-word keywords use \b…(?:s|es)?\b so that:
// • "top" matches "Silk Top" / "Silk Tops" — but NOT "Topaz"
// • "tote" matches "Leather Tote" / "Canvas Totes" — but NOT "Toteme"
// • "boot" matches "Ankle Boot" / "Black Boots"
// • "watch" matches "Vintage Watch" / "Vintage Watches"
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

// Specific product title overrides — for items whose titles don't contain matchable keywords.
// Uses case-insensitive substring matching (title must contain the phrase).
const TITLE_OVERRIDES: Array<[string, CategorySlug]> = [
 ["coastal charm", "home"],
];

export const inferCategoryFromTitle = (title: string | null | undefined): CategorySlug => {
 if (!title) return "other-clothing";
 const lower = title.toLowerCase();
 for (const [phrase, cat] of TITLE_OVERRIDES) {
 if (lower.includes(phrase)) return cat;
 }
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
 // Shoes — checked before generic clothing words
 "ballet flat", "ballet flats", "ballerina flat",
 "loafer", "mule", "clog", "slingback", "mary jane", "moccasin",
 "boot", "bootie", "heel", "pump", "sandal", "sneaker", "trainer",
 "espadrille", "wedge", "oxford", "derby", "brogue", "slide",
 "flat", // generic flat (after "ballet flat")
 // Bags
 "clutch", "tote", "handbag", "crossbody", "satchel", "baguette",
 "bucket bag", "shoulder bag",
 "bag",
 // Clothing
 "jacket", "coat", "blazer", "trench", "puffer", "bomber",
 "dress", "gown",
 "skirt",
 "shorts",
 "jumpsuit", "romper",
 "pants", "trousers", "jeans",
 "blouse", "shirt", "top", "tee",
 "sweater", "cardigan", "knit",
 "vest", "suit",
 "cape", "poncho",
 "scarf", "belt",
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

/**
 * Like inferBrandFromTitle but returns the first matched keyword string
 * (e.g. "dolce & gabbana", "chanel") — suitable for SQL ILIKE searches.
 */
export const inferBrandKeywordFromTitle = (title: string): string | null => {
 const t = title.toLowerCase();
 for (const brand of brandDefs) {
 for (const keyword of brand.keywords) {
 const matches =
 keyword.length <= 3
 ? new RegExp(`(?<![a-z])${keyword}(?![a-z])`).test(t)
 : t.includes(keyword);
 if (matches) return keyword;
 }
 }
 return null;
};

/**
 * Returns the primary item-type keyword to use for SQL ILIKE title search.
 * Normalizes compound types to their most searchable single word.
 */
export const inferItemTypeKeyword = (title: string): string | null => {
 const type = inferItemTypeFromTitle(title);
 if (!type) return null;
 // Normalize compound types to the most distinctive word
 const normMap: Record<string, string> = {
 "ballet flat": "ballet flat",
 "ballet flats": "ballet flat",
 "ballerina flat": "ballet flat",
 "bucket bag": "bucket bag",
 "shoulder bag": "shoulder bag",
 };
 return normMap[type] ?? type.split(" ")[0]; // first word is usually searchable
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
 currency: product.currency || "USD",
 category: inferCategoryFromTitle(product.title),
 storeSlug: product.store_slug,
 externalUrl: product.external_url ?? undefined,
 image: product.image ?? undefined,
 images: parseImages(product),
 size: deriveDisplaySize(product),
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
