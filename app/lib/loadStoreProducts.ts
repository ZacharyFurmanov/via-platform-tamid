import type { StoreProduct } from "./types";
import type { CategorySlug } from "@/app/lib/categoryMap";
import { getProductsByStore, type DBProduct } from "./db";
import { brands as brandDefs } from "./brandData";

export const inferCategoryFromTitle = (title: string): CategorySlug => {
  const t = title.toLowerCase();

  if (
    // Product types
    t.includes("heel") ||
    t.includes("shoe") ||
    t.includes("boot") ||
    t.includes("pump") ||
    t.includes("sandal") ||
    t.includes("mule") ||
    t.includes("clog") ||
    t.includes("loafer") ||
    t.includes("sneaker") ||
    t.includes("slipper") ||
    t.includes("espadrille") ||
    t.includes("stiletto") ||
    t.includes("wedge") ||
    t.includes("oxford") ||
    t.includes("derby") ||
    t.includes("brogue") ||
    t.includes("trainer") ||
    t.includes("slide") ||
    t.includes("flat") ||
    t.includes("slingback") ||
    // Shoe-only brands
    t.includes("blahnik") ||
    t.includes("louboutin") ||
    t.includes("stuart weitzman") ||
    t.includes("roger vivier")
  ) {
    return "shoes";
  }

  if (
    t.includes("bag") ||
    t.includes("clutch") ||
    t.includes("tote") ||
    t.includes("purse") ||
    t.includes("handbag")
  ) {
    return "bags";
  }

  if (
    t.includes("belt") ||
    t.includes("scarf") ||
    t.includes("hat") ||
    t.includes("sunglasses") ||
    t.includes("jewelry") ||
    t.includes("necklace") ||
    t.includes("bracelet") ||
    t.includes("earring") ||
    t.includes("watch")
  ) {
    return "accessories";
  }

  // Clothing subcategories (most specific first)
  if (t.includes("dress") || t.includes("gown")) return "dresses";

  if (
    t.includes("coat") ||
    t.includes("jacket") ||
    t.includes("blazer") ||
    t.includes("parka") ||
    t.includes("windbreaker") ||
    t.includes("puffer") ||
    t.includes("bomber") ||
    t.includes("trench") ||
    t.includes("overcoat") ||
    t.includes("cape") ||
    t.includes("poncho") ||
    t.includes("anorak")
  ) {
    return "coats-jackets";
  }

  if (
    t.includes("sweater") ||
    t.includes("cardigan") ||
    t.includes("knit") ||
    t.includes("pullover") ||
    t.includes("hoodie") ||
    t.includes("sweatshirt") ||
    t.includes("turtleneck") ||
    t.includes("crewneck")
  ) {
    return "sweaters";
  }

  if (t.includes("jean") || t.includes("denim")) return "jeans";

  if (
    t.includes("pants") ||
    t.includes("trousers") ||
    t.includes("cargo") ||
    t.includes("chino") ||
    t.includes("jogger") ||
    t.includes("sweatpant") ||
    t.includes("wide-leg") ||
    t.includes("flare")
  ) {
    return "pants";
  }

  if (t.includes("shorts")) return "shorts";

  if (t.includes("skirt")) return "skirts";

  if (
    t.includes("jumpsuit") ||
    t.includes("romper") ||
    t.includes("playsuit") ||
    t.includes("overall")
  ) {
    return "jumpsuits";
  }

  if (
    t.includes("top") ||
    t.includes("blouse") ||
    t.includes("shirt") ||
    t.includes("tee") ||
    t.includes("t-shirt") ||
    t.includes("tank") ||
    t.includes("cami") ||
    t.includes("bodysuit") ||
    t.includes("corset") ||
    t.includes("bustier") ||
    t.includes("halter") ||
    t.includes("polo") ||
    t.includes("henley") ||
    t.includes("tube")
  ) {
    return "tops";
  }

  // Default fallback for unmatched clothing
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
