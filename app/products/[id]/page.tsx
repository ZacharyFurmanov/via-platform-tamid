import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getProductById, getRecommendedProducts, getProductsByTitleKeyword } from "@/app/lib/db";
import { stores } from "@/app/lib/stores";
import { categoryMap } from "@/app/lib/categoryMap";
import { categories } from "@/app/lib/categories";
import BackButton from "@/app/components/BackButton";
import { deriveSize } from "@/app/lib/inventory";
import { inferCategoryFromTitle, inferItemTypeFromTitle, inferColorFromTitle, inferBrandFromTitle, inferBrandKeywordFromTitle, inferItemTypeKeyword } from "@/app/lib/loadStoreProducts";
import ImageCarousel from "@/app/components/ImageCarousel";
import FavoriteButton from "@/app/components/FavoriteButton";
import AddToCartButton from "@/app/components/AddToCartButton";
import BuyNowButton from "@/app/components/BuyNowButton";
import { getProductFavoriteCount } from "@/app/lib/favorites-db";
import { getProductCartCount } from "@/app/lib/cart-db";
import ProductQuestion from "@/app/components/ProductQuestion";
import ProductAccordion from "@/app/components/ProductAccordion";
import TrackProductView from "@/app/components/TrackProductView";
import TrackedStoreLink from "@/app/components/TrackedStoreLink";
import AddToCollectionButton from "@/app/components/AddToCollectionButton";

type ProductPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};

// Guard against non-size values (like colors) that may have been stored as size in older syncs
const VALID_SIZE_RE = /^(?:(?:US|UK|EU|IT)\s*)?\d[\d.]*$|^(?:XS|S|M|L|XL|XXL|2XL|3XL|XXXL|OS|OSFM|One\s+Size)$/i;

function expandSize(size: string): string {
  const map: Record<string, string> = {
    XS: "Extra Small",
    S: "Small",
    M: "Medium",
    L: "Large",
    XL: "Extra Large",
    XXL: "XXL",
    XXXL: "XXXL",
    OS: "One Size",
    OSFM: "One Size",
  };
  return map[size.toUpperCase()] ?? size;
}

const MEASUREMENT_KEYWORDS = [
  "shoulder", "sleeve", "bust", "chest", "waist", "hip", "inseam",
  "outseam", "rise", "hem", "thigh", "knee", "pit", "armhole",
  "width", "circumference", "belt", "back length", "front length",
  "total length", "length", "pit to pit",
];

// Section headers that signal a measurements block
const MEASUREMENT_HEADERS = /^measurements?[:\s]*$/i;
// Section headers that signal the end of a measurements block
const SECTION_HEADER_RE = /^([A-Z][A-Z\s&/]{2,}):?\s*$/;

/** Returns true if a plain-text line looks like a size or measurement */
function isMeasurementLine(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (!t) return false;
  // Size labels: "Size: M", "Labeled size: 10", "Tagged size S", "Size & fit: ..."
  if (/(?:tagged|labeled|marked)?\s*size\s*[:\s&]/.test(t)) return true;
  // Dimension/measurement labels
  if (/^(?:dimensions?|measurements?)\s*:/.test(t)) return true;
  // Measurement with optional ~ and inches/cm value: "Bust: ~16"", "Waist: 14 cm"
  if (/:\s*~?\s*\d+(?:[.,]\d+)?\s*(?:["″''"]|cm|in\b)/.test(t)) {
    return MEASUREMENT_KEYWORDS.some((kw) => t.includes(kw));
  }
  // "16" flat", "~37"" with a keyword somewhere in the line
  if (/~?\d+(?:[.,]\d+)?\s*["″''"]\s*(?:flat|laid flat)?/.test(t)) {
    return MEASUREMENT_KEYWORDS.some((kw) => t.includes(kw));
  }
  // "flat measurements: bust 20 in pit to pit, waist 19.5 in, ..." — "measurements" keyword + numeric value with unit
  if (/\bmeasurements?\b/.test(t) && /\d[\d.]*\s*(?:in\b|cm\b)/.test(t)) return true;
  // Multiple inline measurements on one line: "bust 20 in, waist 19.5 in, hips 21 in"
  if (((t.match(/\d[\d.]*\s*(?:in|cm)\b/g)) || []).length >= 2) return true;
  return false;
}

// Labels that signal a condition line
const CONDITION_LABEL_RE = /^(overall|condition|upper|lower|interior|exterior|hardware|sole|heel|lining|strap|clasp|zipper|buckle|toe|cap|front|back|handles?|base|corners?|bottom|sides?|edges?)\s*:/i;
// Keywords anywhere in the line that signal condition content
const CONDITION_KEYWORD_RE = /\b(condition|preowned|pre-?owned|pre-?loved|wear|worn|scuff|scratch|fad(ing)?|missing|intact|snag|fray|crack|patina|stain|mark|repair|restor|damag|chip|tear|peel|rub|soil|discolor|yellowing|tarnish|oxidiz|light use|gently used|like new|mint|NWT|NWOT|EUC|VGUC|GUC)\b/i;
// Section headers that signal a condition block
const CONDITION_HEADERS = /^condition[:\s]*$/i;

/** Returns true if a plain-text line is primarily about item condition */
function isConditionLine(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (CONDITION_LABEL_RE.test(t)) return true;
  if (t.startsWith("*")) return true; // asterisk notes are typically condition caveats
  if (CONDITION_KEYWORD_RE.test(t)) return true;
  return false;
}

/**
 * Splits description HTML into product details, sizing/measurements, and condition.
 * Each bucket is mutually exclusive — a line goes into exactly one.
 */
function splitDescription(html: string | null): {
  detailsHtml: string | null;
  sizingItems: string[];
  conditionItems: string[];
} {
  if (!html) return { detailsHtml: null, sizingItems: [], conditionItems: [] };

  html = html
    .replace(/<div([^>]*)>/gi, "<p$1>")
    .replace(/<\/div>/gi, "</p>")
    // Convert ALL heading tags to <p> so section headers like <h2>Condition</h2> get parsed
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, "<p>$1</p>");

  const detailItems: string[] = [];
  const sizingItems: string[] = [];
  const conditionItems: string[] = [];

  // --- Strategy 1: <li>-based descriptions ---
  const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  let hasLiTags = false;

  while ((match = liPattern.exec(html)) !== null) {
    hasLiTags = true;
    const inner = match[1];
    const plain = inner.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").trim();
    if (isMeasurementLine(plain)) {
      sizingItems.push(plain);
    } else if (isConditionLine(plain)) {
      conditionItems.push(plain);
    } else {
      detailItems.push(`<li>${inner}</li>`);
    }
  }

  if (hasLiTags) {
    // Scan <p> tags (including converted headings) with full section-state tracking
    const pPattern2 = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pMatch: RegExpExecArray | null;
    let inConditionSectionP = false;
    let inMeasurementsSectionP = false;
    while ((pMatch = pPattern2.exec(html)) !== null) {
      const inner = pMatch[1];
      const plain = inner.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").trim();
      if (!plain) continue;
      // Section header detection
      if (CONDITION_HEADERS.test(plain)) { inConditionSectionP = true; inMeasurementsSectionP = false; continue; }
      if (MEASUREMENT_HEADERS.test(plain)) { inMeasurementsSectionP = true; inConditionSectionP = false; continue; }
      if (SECTION_HEADER_RE.test(plain)) { inConditionSectionP = false; inMeasurementsSectionP = false; continue; }
      // Section content
      if (inConditionSectionP) { conditionItems.push(plain); continue; }
      if (inMeasurementsSectionP) { sizingItems.push(plain); continue; }
      // Fallback keyword matching
      if (isMeasurementLine(plain)) sizingItems.push(plain);
      else if (isConditionLine(plain)) conditionItems.push(plain);
    }
    const detailsHtml = detailItems.length > 0 ? `<ul>${detailItems.join("")}</ul>` : null;
    return { detailsHtml, sizingItems, conditionItems };
  }

  // --- Strategy 2: <p>-based descriptions ---
  const expandedHtml = html.replace(
    /<p([^>]*)>([\s\S]*?)<\/p>/gi,
    (_, attrs, inner) => {
      const lines = inner.split(/<br\s*\/?>/i).map((l: string) => l.trim()).filter(Boolean);
      if (lines.length <= 1) return `<p${attrs}>${inner}</p>`;
      return lines.map((l: string) => `<p${attrs}>${l}</p>`).join("");
    }
  );

  const pPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs: { inner: string; plain: string }[] = [];
  while ((match = pPattern.exec(expandedHtml)) !== null) {
    const inner = match[1];
    const plain = inner.replace(/<[^>]+>/g, "").replace(/&(?:[a-z]+|#\d+);/gi, " ").trim();
    paragraphs.push({ inner, plain });
  }

  if (paragraphs.length === 0) return { detailsHtml: html, sizingItems: [], conditionItems: [] };

  let inMeasurementsSection = false;
  let inConditionSection = false;
  const remaining: string[] = [];

  for (const { inner, plain } of paragraphs) {
    if (MEASUREMENT_HEADERS.test(plain)) { inMeasurementsSection = true; inConditionSection = false; continue; }
    if (CONDITION_HEADERS.test(plain)) { inConditionSection = true; inMeasurementsSection = false; continue; }

    if (inMeasurementsSection) {
      if (SECTION_HEADER_RE.test(plain)) { inMeasurementsSection = false; remaining.push(`<p>${inner}</p>`); }
      else if (plain) sizingItems.push(plain);
      continue;
    }
    if (inConditionSection) {
      if (SECTION_HEADER_RE.test(plain)) { inConditionSection = false; remaining.push(`<p>${inner}</p>`); }
      else if (plain) conditionItems.push(plain);
      continue;
    }

    if (isMeasurementLine(plain)) sizingItems.push(plain);
    else if (isConditionLine(plain)) conditionItems.push(plain);
    else remaining.push(`<p>${inner}</p>`);
  }

  const detailsHtml = remaining.length > 0 ? remaining.join("") : null;
  return { detailsHtml, sizingItems, conditionItems };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id: compositeId } = await params;
  const match = compositeId.match(/^(.+)-(\d+)$/);
  if (!match) return {};
  const dbId = parseInt(match[2], 10);
  if (isNaN(dbId)) return {};
  const product = await getProductById(dbId);
  if (!product) return {};

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://vyaplatform.com";
  const image = product.image ?? undefined;
  const price = `$${Math.round(Number(product.price))}`;
  const description = `${price} — ${product.store_name}`;

  return {
    title: `${product.title} — VYA`,
    description,
    openGraph: {
      title: product.title,
      description,
      url: `${BASE_URL}/products/${compositeId}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description,
    },
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { id: compositeId } = await params;
  const { from } = await searchParams;

  // Parse the DB integer ID from composite format: "store-slug-123"
  const match = compositeId.match(/^(.+)-(\d+)$/);
  if (!match) return notFound();

  const storeSlug = match[1];
  const dbId = parseInt(match[2], 10);
  if (isNaN(dbId)) return notFound();

  // Fetch product first so we can build a smarter recommendation pool
  const product = await getProductById(dbId);
  if (!product) return notFound();

  const currentBrand = inferBrandFromTitle(product.title);
  const currentBrandKeyword = inferBrandKeywordFromTitle(product.title);
  const currentItemType = inferItemTypeFromTitle(product.title);
  const currentItemTypeKeyword = inferItemTypeKeyword(product.title);
  const currentColor = inferColorFromTitle(product.title);
  const currentCategorySlug = inferCategoryFromTitle(product.title);

  // Build recommendation pool from three sources:
  // 1. Brand-keyword pool — fetches items whose title contains the brand name (e.g. "dolce & gabbana")
  // 2. Item-type pool — fetches items whose title contains the item type word (e.g. "top", "ballet flat")
  // 3. Random fallback for variety
  const [favoriteCount, cartCount, brandCandidates, itemTypeCandidates, randomCandidates] = await Promise.all([
    getProductFavoriteCount(dbId).catch(() => 0),
    getProductCartCount(dbId).catch(() => 0),
    currentBrandKeyword
      ? getProductsByTitleKeyword(currentBrandKeyword, dbId, 40).catch(() => [])
      : Promise.resolve([]),
    currentItemTypeKeyword
      ? getProductsByTitleKeyword(currentItemTypeKeyword, dbId, 40).catch(() => [])
      : Promise.resolve([]),
    getRecommendedProducts(dbId, 60).catch(() => []),
  ]);

  // Merge all pools, dedup by id
  const seen = new Set<number>();
  const allCandidates = [...brandCandidates, ...itemTypeCandidates, ...randomCandidates].filter((p) => {
    if (p.id === dbId || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // Score each candidate:
  //   same category + same brand + same item type = 10 pts (perfect match)
  //   same category + same brand                 = 8 pts
  //   same category + same item type             = 7 pts
  //   same brand + same item type                = 5 pts
  //   same category only                         = 5 pts
  //   same brand only                            = 3 pts
  //   same item type only                        = 2 pts
  //   same color                                 = 1 pt tiebreaker
  const scored = allCandidates.map((p) => {
    const pCategory = inferCategoryFromTitle(p.title);
    const pBrand = inferBrandFromTitle(p.title);
    const pItemType = inferItemTypeFromTitle(p.title);
    const pColor = inferColorFromTitle(p.title);
    let score = 0;
    if (pCategory === currentCategorySlug) score += 5;
    if (currentBrand && pBrand === currentBrand) score += 3;
    if (currentItemType && pItemType === currentItemType) score += 2;
    if (currentColor && pColor === currentColor) score += 1;
    return { product: p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // If there are at least 4 same-category candidates, only show same-category results.
  // This prevents a bag or earrings from appearing when viewing a top or dress.
  const sameCategoryScored = scored.filter((s) => inferCategoryFromTitle(s.product.title) === currentCategorySlug);
  const finalPool = sameCategoryScored.length >= 4 ? sameCategoryScored : scored;
  const recommendations = finalPool.slice(0, 4).map((s) => s.product);

  const storeConfig = stores.find((s) => s.slug === storeSlug);
  const store = storeConfig ?? {
    slug: product.store_slug,
    name: product.store_name,
    location: "",
  };

  const categorySlug = currentCategorySlug;
  const categoryLabel = categoryMap[categorySlug];
  const price = `$${Math.round(Number(product.price))}`;
  const compareAtPrice =
    product.compare_at_price && Number(product.compare_at_price) > Number(product.price)
      ? `$${Math.round(Number(product.compare_at_price))}`
      : null;

  // Use deriveSize to extract the correct size (checks title first, then description, then DB)
  const rawSize = deriveSize(product);
  const displaySize = rawSize ? expandSize(rawSize) : null;

  // Parse images from DB
  let productImages: string[] = [];
  if (product.images) {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed) && parsed.length > 0) productImages = parsed;
    } catch {}
  }
  if (productImages.length === 0 && product.image) {
    productImages = [product.image];
  }

  // Build direct cart URL. The /api/track route handles attribution (collabs.shop
  // redirect for single items, dt_id for multi-item carts).
  let checkoutUrl = product.external_url || "";
  if (product.variant_id && product.external_url) {
    try {
      const productUrl = new URL(product.external_url);
      checkoutUrl = `${productUrl.origin}/cart/${product.variant_id}:1`;
    } catch {}
  }
  const { detailsHtml, sizingItems, conditionItems } = splitDescription(product.description);

  return (
    <main className="bg-[#F7F3EA] min-h-screen">
      <TrackProductView
        productId={compositeId}
        title={product.title}
        price={Number(product.price)}
        category={categoryLabel}
        storeName={store.name}
        storeSlug={store.slug}
        size={displaySize}
      />
      {/* Back nav */}
      <div className="max-w-6xl mx-auto px-6 pt-4 pb-2 md:pt-8 md:pb-4">
        <BackButton
          label={from?.startsWith("/categories/")
            ? categories.find((c) => `/categories/${c.slug}` === from)?.label ?? "Category"
            : from === "/browse"
            ? "Browse"
            : store.name}
        />
      </div>

      {/* Product layout */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-16">
          {/* Image */}
          <ImageCarousel
            images={productImages}
            alt={product.title}
            variant="detail"
          />

          {/* Details */}
          <div className="flex flex-col justify-center py-1 md:py-8">
            <TrackedStoreLink
              href={`/stores/${store.slug}`}
              storeSlug={store.slug}
              storeName={store.name}
              surface="product_detail"
              className="text-xs uppercase tracking-[0.2em] text-black/50 hover:text-black transition mb-1"
            >
              {store.name}
            </TrackedStoreLink>

            <h1 className="text-xl sm:text-4xl font-serif text-black leading-snug mb-1">
              {product.title}
            </h1>

            <p className="text-sm text-black/50 mb-0.5">{categoryLabel}</p>

            {displaySize && (
              <p className="text-sm text-black/70 mb-0.5">
                Size: <span className="font-medium">{displaySize}</span>
              </p>
            )}

            <div className="flex items-center gap-4 mb-4 md:mb-8">
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-medium text-black">{price}</p>
                {compareAtPrice && (
                  <p className="text-base text-black/40 line-through">{compareAtPrice}</p>
                )}
              </div>
              <FavoriteButton type="product" targetId={dbId} size="md" favoriteCount={favoriteCount} />
              {cartCount > 0 && (
                <span className="text-xs text-black/50">
                  {cartCount} {cartCount === 1 ? "person has" : "people have"} this in their cart
                </span>
              )}
            </div>

            {/* Accordion details */}
            <div className="mb-4 md:mb-8">
              <ProductAccordion
                sections={[
                  {
                    title: "Product Details",
                    content: detailsHtml ? (
                      <div
                        className="product-description prose prose-sm max-w-none [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_strong]:text-black [&_h1]:text-lg [&_h1]:font-serif [&_h2]:text-base [&_h2]:font-serif [&_h3]:text-sm [&_h3]:font-medium [&_br]:block"
                        dangerouslySetInnerHTML={{ __html: detailsHtml }}
                      />
                    ) : (
                      <p>{product.title}</p>
                    ),
                  },
                  {
                    title: "Sizing & Measurements",
                    content: (
                      <div>
                        {displaySize && (
                          <p className="mb-3">
                            <span className="font-medium">Size:</span> {displaySize}
                          </p>
                        )}
                        {sizingItems.length > 0 && (
                          <ul className="list-disc pl-5 mb-3 space-y-1">
                            {sizingItems.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        )}
                        <p className="text-black/60 text-sm">
                          This is a vintage or secondhand item. Sizing may vary from modern standards.
                          We recommend checking measurements carefully before purchasing.
                        </p>
                        {sizingItems.length === 0 && !displaySize && (
                          <p className="mt-2 text-sm">
                            For specific measurements,{" "}
                            <a href="#more-info" className="underline hover:text-black transition">
                              ask below
                            </a>
                            .
                          </p>
                        )}
                      </div>
                    ),
                  },
                  {
                    title: "Condition",
                    content: conditionItems.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {conditionItems.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-black/60 italic">
                        Condition not described — please refer to the photos listed.
                      </p>
                    ),
                  },
                  {
                    title: "Authenticity & Curation",
                    content: (
                      <p>
                        {storeConfig && "authenticityPolicy" in storeConfig && storeConfig.authenticityPolicy
                          ? String(storeConfig.authenticityPolicy)
                          : `All items sold by ${store.name} are personally sourced and inspected before listing. Each piece is described accurately — please review all item details and photos carefully before purchasing.`}
                      </p>
                    ),
                  },
                  {
                    title: "Shipping & Returns",
                    content: (
                      <div>
                        {storeConfig?.perk && (
                          <p className="mb-3 font-medium text-black">{storeConfig.perk}</p>
                        )}
                        <p className="mb-1 font-medium text-black text-xs uppercase tracking-wide">Shipping</p>
                        <p className="mb-4">
                          {storeConfig?.shippingPolicy ??
                            `This item ships directly from ${store.name}${storeConfig?.location ? ` (${storeConfig.location})` : ""}. Shipping rates and delivery times are determined by the store at checkout.`}
                        </p>
                        <p className="mb-1 font-medium text-black text-xs uppercase tracking-wide">Returns</p>
                        <p>
                          {storeConfig?.returnPolicy ??
                            `All sales are final. Please review all item details carefully before purchasing.`}
                        </p>
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            <ProductQuestion
              productTitle={product.title}
              storeName={store.name}
              productUrl={`https://vyaplatform.com/products/${compositeId}`}
            />

            {/* Add to Cart */}
            {product.external_url ? (
              <>
                <AddToCartButton
                  item={{
                    compositeId,
                    title: product.title,
                    price: Number(product.price),
                    image: productImages[0] || "",
                    storeName: store.name,
                    storeSlug: store.slug,
                    externalUrl: product.external_url,
                    checkoutUrl,
                    collabsLink: product.collabs_link ?? undefined,
                  }}
                />
                <BuyNowButton
                  compositeId={compositeId}
                  title={product.title}
                  price={`$${product.price}`}
                  image={productImages[0] || ""}
                  storeName={store.name}
                  storeSlug={store.slug}
                  externalUrl={product.external_url || ""}
                  checkoutUrl={checkoutUrl}
                />
              </>
            ) : (
              <button
                disabled
                className="block w-full bg-neutral-300 text-white py-4 text-sm uppercase tracking-wide text-center cursor-not-allowed"
              >
                Coming Soon
              </button>
            )}

            <AddToCollectionButton
              productId={dbId}
              snapshot={{
                title: product.title,
                price: Number(product.price),
                image: productImages[0] || "",
                store: store.name,
                storeSlug: store.slug,
              }}
            />
          </div>
        </div>
      </div>

      {/* Recommendations section */}
      {recommendations.length > 0 && (
        <section className="border-t border-neutral-200 bg-[#f7f6f3]">
          <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
            <h2 className="font-serif text-2xl sm:text-3xl text-black text-center mb-10">
              We think you&apos;d like these too
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {recommendations.map((rec) => {
                const recId = `${rec.store_slug}-${rec.id}`;
                const recPrice = `$${Math.round(Number(rec.price))}`;
                const recCategory = categoryMap[inferCategoryFromTitle(rec.title)];

                let recImages: string[] = [];
                if (rec.images) {
                  try {
                    const parsed = JSON.parse(rec.images);
                    if (Array.isArray(parsed) && parsed.length > 0)
                      recImages = parsed;
                  } catch {}
                }
                if (recImages.length === 0 && rec.image) {
                  recImages = [rec.image];
                }

                return (
                  <Link
                    key={rec.id}
                    href={`/products/${recId}`}
                    className="group block bg-white rounded-sm overflow-hidden transition-shadow duration-300 hover:shadow-lg"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      {recImages.length > 0 ? (
                        <img
                          src={recImages[0]}
                          alt={rec.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                          <span className="text-neutral-400 text-xs uppercase tracking-wide">
                            No image
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 sm:p-4">
                      <p className="text-[10px] sm:text-[11px] uppercase tracking-wide text-black/50 mb-1">
                        {rec.store_name}
                      </p>
                      <h3 className="font-serif text-sm sm:text-base text-black leading-snug line-clamp-2 mb-1">
                        {rec.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-black/50 mb-2">
                        {recCategory}
                      </p>
                      <p className="text-sm font-medium text-black mb-3">
                        {recPrice}
                      </p>
                      <span className="inline-block text-[11px] sm:text-xs uppercase tracking-[0.15em] text-black/60 group-hover:text-black transition-colors duration-300">
                        View Details &rarr;
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
