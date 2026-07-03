import type { CategorySlug } from "./categoryMap";
import { getAllProducts, type DBProduct } from "./db";
import { inferCategoryFromTitle, inferBrandFromTitle } from "./loadStoreProducts";
import { brandMap } from "./brandData";
import { extractSizeFromTitle, extractSizeFromDescription, extractTaggedSizeFromDescription, extractFitSizeFromDescription, extractFitLetterFromDescription, extractUSConversionFromDescription, isValidSizeValue, GENERIC_CLOTHING_SIZE } from "./shopifyClient";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "One Size"];

const SHOE_RE = /shoe|boot|heel|sneaker|flat|sandal|loafer|pump|mule|slipper|clog/i;

const EU_SHOE_TO_US: Record<string, string> = {
 "34": "4", "34.5": "4.5",
 "35": "5", "35.5": "5",
 "36": "5.5", "36.5": "6",
 "37": "6.5", "37.5": "7",
 "38": "7.5", "38.5": "8",
 "39": "8.5", "39.5": "9",
 "40": "9.5", "40.5": "10",
 "41": "10.5", "41.5": "11",
 "42": "11", "42.5": "11.5",
 "43": "12", "44": "13",
};

function fmtNum(n: number): string {
 return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Convert a raw size string to a US size label, using category context to
 * distinguish shoe EU/UK sizes from clothing EU/UK sizes.
 * Returns null if no conversion applies (caller should display the raw/normalized value).
 */
export function convertSizeToUS(raw: string, categorySlug: string, title?: string, currency?: string): string | null {
 const s = raw.trim();
 const normalized = normalizeSize(s);
 // Detect footwear from the TITLE as well as the category — category inference misses
 // typo'd/one-word titles ("…LABOOTS"), and getting this wrong applies the CLOTHING scale
 // to a shoe (EU 36 → "US 4" instead of the shoe table's US 5.5).
 const isShoe = SHOE_RE.test(categorySlug) || (!!title && SHOE_RE.test(title));
 // The store's sizing region, inferred from its Shopify base currency — a UK shop's bare
 // shoe number is a UK size (women's US = UK + 2), so "3.5" → US 5.5, not raw "3.5".
 const region = currency === "GBP" ? "UK" : currency === "EUR" ? "EU" : "US";

 // European sizing — read the ACTUAL system off the original string. Italian,
 // French and German women's clothing use DIFFERENT US offsets, so collapsing
 // them all to one "EU − 32" formula is wrong (e.g. Italian houses like Gucci/
 // Prada label "IT 40", which is US 4, not US 8).
 //   Italian (IT):  US = IT − 36   (IT 38→2, 40→4, 42→6…)
 //   French (FR):   US = FR − 32   (FR 36→4, 38→6, 40→8…)
 //   German (DE):   US = DE − 30   (DE 34→4, 36→6, 38→8…)
 //   Generic "EU":  US = EU − 32   (defaults to the French scale)
 // Shoe sizes are unified across the European systems, so they share one table.
 const sysMatch = /^(IT|FR|DE|EU)\s*(\d+(?:\.\d+)?)$/i.exec(s);
 if (sysMatch) {
 const sys = sysMatch[1].toUpperCase();
 const num = sysMatch[2];
 if (isShoe) {
  const us = EU_SHOE_TO_US[num];
  return us ? `US ${us}` : null;
 }
 const offset = sys === "IT" ? 36 : sys === "DE" ? 30 : 32;
 const us = parseFloat(num) - offset;
 if (us >= 0 && us <= 24) return `US ${fmtNum(us)}`;
 return null;
 }

 // UK prefix (normalizeSize strips it, so check original)
 const ukMatch = /^UK\s*(\d+(?:\.\d+)?)$/i.exec(s);
 if (ukMatch) {
 const num = parseFloat(ukMatch[1]);
 if (isShoe) return `US ${fmtNum(num + 2)}`;
 const us = num - 4;
 if (us >= 0) return `US ${fmtNum(us)}`;
 return null;
 }

 // Bare numeric — infer from category
 if (/^\d+(?:\.\d+)?$/.test(normalized)) {
 const num = parseFloat(normalized);
 if (isShoe && num >= 34 && num <= 44) {
  const us = EU_SHOE_TO_US[normalized];
  return us ? `US ${us}` : null;
 }
 // A UK shop's small bare shoe number is a UK size (women's US = UK + 2).
 if (isShoe && region === "UK" && num >= 1 && num <= 12) {
  return `US ${fmtNum(num + 2)}`;
 }
 if (!isShoe && num >= 32 && num <= 52 && num % 2 === 0) {
  return `US ${num - 32}`;
 }
 }

 return null;
}

export function normalizeSize(raw: string): string {
 // Strip leading/trailing whitespace and trailing punctuation
 const s = raw.trim().replace(/[.,]+$/, "").trim();
 const l = s.toLowerCase();

 // Clothing word sizes
 if (/^x{2,}s$/i.test(s) || l === "extra small") return "XS";
 if (/^xs$/i.test(s)) return "XS";
 if (/^s$/i.test(s) || l === "small") return "S";
 if (/^m$/i.test(s) || l === "medium") return "M";
 if (/^l$/i.test(s) || l === "large") return "L";
 if (/^xl$/i.test(s) || l === "extra large") return "XL";
 if (/^(xxl|2xl)$/i.test(s)) return "XXL";
 if (/^(xxxl|3xl)$/i.test(s)) return "XXXL";
 if (/^(os|osfm|one\s*size)$/i.test(s)) return "One Size";

 // Range sizes — collapse to the smaller size
 if (/^(xs)[\/\-](s)$/i.test(s)) return "XS";
 if (/^(s)[\/\-](m)$/i.test(s)) return "S";
 if (/^(m)[\/\-](l)$/i.test(s)) return "M";
 if (/^(l)[\/\-](xl)$/i.test(s)) return "L";
 if (/^(xl)[\/\-](xxl)$/i.test(s)) return "XL";

 // EU / IT / FR / DE are all the same European scale — normalise to "EU XX"
 // e.g. "IT 40", "IT40", "EU 38.", "FR 42" → "EU 40", "EU 38", "EU 42"
 const euMatch = /^(IT|EU|FR|DE)\s*(\d+(?:\.\d+)?)$/i.exec(s);
 if (euMatch) return `EU ${euMatch[2]}`;

 // US/UK sizing: strip prefix, treat as plain number
 const usMatch = /^US\s*(\d+(?:\.\d+)?)$/i.exec(s);
 if (usMatch) return usMatch[1];

 const ukMatch = /^UK\s*(\d+(?:\.\d+)?)$/i.exec(s);
 if (ukMatch) return ukMatch[1];

 // Plain number (already stripped trailing period above)
 if (/^\d+(?:\.\d+)?$/.test(s)) return s;

 return s;
}

// The set of bare, prefix-stripped size tokens a product should match a filter
// on. A size can describe a RANGE of fits — a seller's "best fits US 2-4", a
// variant "S/M" — and such an item must surface under EVERY size in that range,
// not just an exact string match. Single sizes return one token (the same value
// the facet list is keyed on); ranges expand to every size they cover.
//   "US 2-4"  → ["2","4"]          "6-8" → ["6","8"]   (endpoints only — no 3, no 7)
//   "S/M"     → ["S","M"]          "8"   → ["8"]
const SIZE_LETTER_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
function bareSize(s: string): string {
 return s.trim().toUpperCase().replace(/^(US|UK|EU|IT|FR|DE)\s*/, "").trim();
}
export function expandSizeKeys(rawSize: string | null | undefined): string[] {
 if (!rawSize) return [];
 const core = bareSize(rawSize);
 const m = /^([A-Z0-9.]+)\s*(?:[-–—/]|to)\s*([A-Z0-9.]+)$/i.exec(core);
 if (m) {
 const [, a, b] = m;
 // Numeric range → the two ENDPOINTS only. A "2-4" fits a 2 and a 4, never a
 // 3 (women's clothing sizes are even; in-between numbers aren't real sizes).
 if (/^\d{1,2}(?:\.\d)?$/.test(a) && /^\d{1,2}(?:\.\d)?$/.test(b)) {
 return [...new Set([a.replace(/\.0$/, ""), b.replace(/\.0$/, "")])];
 }
 // Letter range → every size between the ends ("S-L" → S, M, L).
 const ai = SIZE_LETTER_ORDER.indexOf(a.toUpperCase());
 const bi = SIZE_LETTER_ORDER.indexOf(b.toUpperCase());
 if (ai !== -1 && bi !== -1 && bi >= ai) return SIZE_LETTER_ORDER.slice(ai, bi + 1);
 }
 // Single size — normalise the same way the facet keys are built.
 return [bareSize(normalizeSize(rawSize))];
}

export function sortSizes(sizes: string[]): string[] {
 return [...sizes].sort((a, b) => {
 const ai = SIZE_ORDER.indexOf(a);
 const bi = SIZE_ORDER.indexOf(b);
 if (ai !== -1 && bi !== -1) return ai - bi;
 if (ai !== -1) return -1;
 if (bi !== -1) return 1;
 const an = parseFloat(a.replace(/[^0-9.]/g, ""));
 const bn = parseFloat(b.replace(/[^0-9.]/g, ""));
 if (!isNaN(an) && !isNaN(bn)) return an - bn;
 return a.localeCompare(b);
 });
}

export type InventoryItem = {
 id: string;
 title: string;
 category: CategorySlug;
 brand: string | null;
 brandLabel: string | null;
 price: number;
 currency?: string;
 compareAtPrice?: number | null;
 image: string;
 images: string[];
 store: string;
 storeSlug: string;
 externalUrl?: string;
 syncedAt?: string;
 createdAt?: string;
 size?: string | null;
 imageColor?: string | null; // colour read off the image by vision (normalized)
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

/**
 * Derive the best size for a product. The SELLER'S OWN DESCRIPTION wins — what
 * they wrote about fit/size is trusted over the listing title and the raw
 * Shopify variant size. Priority:
 * 0. Seller US fit note in description — "runs true to a 6", "fits like a 6.5"
 * 1. Tagged/labeled/marked size in description — "Tagged size: EU 38"
 * 2. Any explicit size in the description — "Size: 4", "EU 38", "fits XS"
 * 3. Title extraction — size written in the listing title (e.g. "Dress – M")
 * 4. Non-generic DB size — Shopify variant (numeric / EU/UK prefixed)
 * 5. Measurements fallback (bust/waist → S/M/L)
 * 6. Generic DB size (S/M/L) — last resort
 *
 * Exported so it can be used by server components that work directly with DBProduct
 * (NewArrivalsSection, new-arrivals page, account favorites, etc.)
 */
// Some stores write the size as a bare token on the first non-empty line of the
// description ("38 1/2" for a shoe, "8" or "M" for clothing) with no "Size:" label.
// Bare numbers are normally skipped to avoid false positives (a "2001" in a title is
// a year), but a SHORT first line that IS just a size — and in shoe range for
// footwear — is almost certainly the real size.
// Squarespace (and some Shopify) descriptions are HTML — often entity-encoded
// ("&lt;p&gt;38&lt;/p&gt;"). Decode entities, turn block tags into line breaks (so a size on
// its own paragraph becomes its own line), and strip the rest. Plain text passes through.
function htmlToText(html: string | null | undefined): string | null {
 if (!html) return null;
 if (!/[<&]/.test(html)) return html;
 let s = html;
 for (let i = 0; i < 2; i++) {
 s = s
  .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&")
  .replace(/&nbsp;/gi, " ").replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"');
 }
 s = s.replace(/<\/(p|div|li|h[1-6])>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ");
 return s.replace(/[ \t]+/g, " ").replace(/[ \t]*\n[ \t]*/g, "\n").replace(/\n{2,}/g, "\n").trim();
}

function extractLeadingSizeFromDescription(description: string | null | undefined, title: string): string | null {
 const lines = (description || "").split(/[\n\r]+/).map((l) => l.trim()).filter((l) => l.length > 0);
 const isShoe = SHOE_RE.test(title) || SHOE_RE.test(inferCategoryFromTitle(title));
 // Many stores put the size on its own line/paragraph with no "Size:" label. Scan the first
 // few lines for a bare size token; for shoes accept the footwear range AND look a few lines
 // in (the size often isn't line 1 — e.g. "sunflower & star details" then "37").
 for (const line of lines.slice(0, isShoe ? 4 : 1)) {
 if (line.length > 8) continue;
 const norm = line.replace("½", " 1/2");
 const numeric = norm.match(/^(\d{1,2})(?:\s?1\/2|\.5)?$/);
 if (numeric) {
  const n = parseInt(numeric[1], 10);
  const value = /1\/2|\.5/.test(norm) ? `${n}.5` : String(n);
  if (isShoe) { if (n >= 4 && n <= 48) return value; continue; }
  if (n >= 0 && n <= 24) return value;
  continue;
 }
 if (/^(XXS|XS|S|M|L|XL|XXL|XXXL)$/i.test(line)) return line.toUpperCase();
 }
 return null;
}

export function deriveSize(product: DBProduct): string | null {
 const result = deriveSizeInner(product);
 // Shoes NEVER use letter sizes (S/M/L) — footwear is numeric, and a letter here
 // is almost always a stray clothing tag/variant or a false-positive description
 // match (e.g. the "M" in "Size: Marked 36"). Prefer a real numeric size from the
 // title; only show nothing if there genuinely isn't one.
 if (result && GENERIC_CLOTHING_SIZE.test(result.trim()) && SHOE_RE.test(inferCategoryFromTitle(product.title))) {
 const fromTitle = extractSizeFromTitle(product.title);
 if (fromTitle && !GENERIC_CLOTHING_SIZE.test(fromTitle.trim())) return fromTitle;
 return null;
 }
 return result;
}

function deriveSizeInner(product: DBProduct): string | null {
 const dbSize = product.size && isValidSizeValue(product.size) ? product.size : null;
 const isGenericDb = dbSize != null && GENERIC_CLOTHING_SIZE.test(dbSize);
 // Descriptions can be HTML (esp. Squarespace) — clean to text once so every extractor
 // below reads the actual words, not the "<p>" tags.
 const desc = htmlToText(product.description);

 // 0. Explicit seller US fit note ("runs true to a 6", "fits like a 6.5") — the
 // seller telling a US buyer what to order, so it beats a marked EU tag size.
 const fitSize = extractFitSizeFromDescription(desc);
 if (fitSize) return fitSize;

 // 0b. Explicit seller LETTER fit ("Best Fit M - XL") — same authority: the
 // seller's stated fit wins over a marked numeric/IT tag, so we show "M-XL"
 // (which filters under M, L and XL) instead of converting IT 54 → "US 18".
 const fitLetter = extractFitLetterFromDescription(desc);
 if (fitLetter) return fitLetter;

 // 0c. Explicit US size from a conversion table the seller wrote ("UK 10 / EU 40 /
 // US 6"). The seller's own US number is authoritative — it beats formula-converting
 // the EU/UK tag (generic EU−32 would wrongly show US 8 for this EU 40 = US 6 piece).
 const usConversion = extractUSConversionFromDescription(desc);
 if (usConversion) return usConversion;

 // 1. Tagged/labeled/marked size in description — most authoritative (actual garment tag)
 // Must run before title/DB to prevent "Size: Large [store bucket]" from winning
 // over "Tagged size: XS [actual tag]" that appears later in the description.
 const taggedSize = extractTaggedSizeFromDescription(desc);
 if (taggedSize) return taggedSize;

 // 2. Any explicit size the seller wrote in the description ("Size: 4",
 // "EU 38", "fits XS"). The seller's own words take precedence over the
 // listing title and the raw Shopify variant size.
 const sizeFromDesc = extractSizeFromDescription(desc);
 if (sizeFromDesc) return sizeFromDesc;

 // 2b. A bare size written as the first line of the description ("38 1/2", "8",
 // "M") — many stores label it this way with no "Size:" prefix. Beats the title.
 const leadingSize = extractLeadingSizeFromDescription(desc, product.title);
 if (leadingSize) return leadingSize;

 // 3. Title — explicit size in the listing title
 const sizeFromTitle = extractSizeFromTitle(product.title);
 if (sizeFromTitle) return sizeFromTitle;

 // 4. Non-generic DB size (Shopify variant — numeric, EU/UK prefixed)
 if (dbSize && !isGenericDb) return dbSize;

 // 5. Generic DB size (S/M/L variant the store set) as last resort.
 // NOTE: we deliberately do NOT infer a size from measurements (bust/waist →
 // S/M/L). If the seller never stated a size, we add none — vintage sizing is
 // too inconsistent to guess, and a wrong size loses sales.
 return dbSize;
}

/**
 * The size shoppers actually SEE and FILTER by — deriveSize, then converted to a
 * US label the same way the product page displays it (so "IT 38" → "US 2",
 * "EU 36" → "US 4", a clothing "40" → "US 8"). Letter sizes, already-US sizes,
 * and ranges pass through unchanged. This is the single source for the size on
 * cards, grids, and the size_keys index — keeping "what you see" === "what you
 * filter". Without this the grid filtered the raw tag (38) while the page showed
 * the conversion (US 2), so the item never matched a US-size filter.
 */
export function deriveDisplaySize(product: DBProduct): string | null {
 const raw = deriveSize(product);
 if (!raw) return null;
 const categorySlug = inferCategoryFromTitle(product.title);
 return convertSizeToUS(raw, categorySlug, product.title, product.currency) ?? raw;
}

// Transform database products to InventoryItem format
function transformDBProduct(product: DBProduct): InventoryItem {
 const brandSlug = inferBrandFromTitle(product.title);
 return {
 id: `${product.store_slug}-${product.id}`,
 title: product.title,
 category: inferCategoryFromTitle(product.title),
 brand: brandSlug,
 brandLabel: brandSlug ? (brandMap[brandSlug] ?? null) : null,
 price: Number(product.price),
 currency: product.currency || "USD",
 compareAtPrice: product.compare_at_price != null ? Number(product.compare_at_price) : null,
 image: product.image ?? "/placeholder.jpg",
 images: parseImages(product),
 imageColor: product.image_color ?? null,
 store: product.store_name,
 storeSlug: product.store_slug,
 externalUrl: product.external_url ?? undefined,
 syncedAt: product.synced_at instanceof Date
 ? product.synced_at.toISOString()
 : String(product.synced_at),
 createdAt: product.created_at instanceof Date
 ? product.created_at.toISOString()
 : product.created_at
 ? String(product.created_at)
 : undefined,
 size: deriveDisplaySize(product),
 };
}

/**
 * Fetch all inventory from the database.
 */
export async function getInventory(): Promise<InventoryItem[]> {
 try {
 const products = await getAllProducts();
 return products.map(transformDBProduct);
 } catch (error) {
 console.error("Failed to fetch inventory from database:", error);
 return [];
 }
}

// Legacy export for backwards compatibility (returns empty array, use getInventory() instead)
export const inventory: InventoryItem[] = [];
