import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductById, getRecommendedProducts } from "@/app/lib/db";
import { stores } from "@/app/lib/stores";
import { categoryMap } from "@/app/lib/categoryMap";
import { categories } from "@/app/lib/categories";
import BackButton from "@/app/components/BackButton";
import { inferCategoryFromTitle, inferItemTypeFromTitle, inferColorFromTitle, inferBrandFromTitle } from "@/app/lib/loadStoreProducts";
import ImageCarousel from "@/app/components/ImageCarousel";
import FavoriteButton from "@/app/components/FavoriteButton";
import AddToCartButton from "@/app/components/AddToCartButton";
import { getProductFavoriteCount } from "@/app/lib/favorites-db";
import ProductQuestion from "@/app/components/ProductQuestion";
import ProductAccordion from "@/app/components/ProductAccordion";

type ProductPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { id: compositeId } = await params;
  const { from } = await searchParams;

  // Parse the DB integer ID from composite format: "store-slug-123"
  const match = compositeId.match(/^(.+)-(\d+)$/);
  if (!match) return notFound();

  const storeSlug = match[1];
  const dbId = parseInt(match[2], 10);
  if (isNaN(dbId)) return notFound();

  // Run all three DB queries in parallel to minimize load time
  const [product, favoriteCount, allCandidates] = await Promise.all([
    getProductById(dbId),
    getProductFavoriteCount(dbId),
    getRecommendedProducts(dbId, 50),
  ]);
  if (!product) return notFound();

  const storeConfig = stores.find((s) => s.slug === storeSlug);
  const store = storeConfig ?? {
    slug: product.store_slug,
    name: product.store_name,
    location: "",
  };

  const categorySlug = inferCategoryFromTitle(product.title);
  const categoryLabel = categoryMap[categorySlug];
  const price = `$${Math.round(Number(product.price))}`;

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

  // Build direct checkout URL for Shopify stores (uses variant ID + discount code)
  let checkoutUrl = product.external_url || "";
  if (product.variant_id && product.external_url) {
    try {
      const productUrl = new URL(product.external_url);
      const storeConfig = stores.find((s) => s.slug === product.store_slug);
      const discountCode = storeConfig && "discountCode" in storeConfig ? storeConfig.discountCode : null;
      const discountParam = discountCode ? `?discount=${discountCode}` : "";
      checkoutUrl = `${productUrl.origin}/cart/${product.variant_id}:1${discountParam}`;
    } catch {}
  }
  const currentItemType = inferItemTypeFromTitle(product.title);
  const currentColor = inferColorFromTitle(product.title);
  const currentBrand = inferBrandFromTitle(product.title);

  const scored = allCandidates.map((p) => {
    let score = 0;
    if (currentItemType && inferItemTypeFromTitle(p.title) === currentItemType) score += 4;
    if (currentColor && inferColorFromTitle(p.title) === currentColor) score += 2;
    if (currentBrand && inferBrandFromTitle(p.title) === currentBrand) score += 1;
    return { product: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const recommendations = scored.slice(0, 4).map((s) => s.product);

  return (
    <main className="bg-white min-h-screen">
      {/* Back nav */}
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          {/* Image */}
          <ImageCarousel
            images={productImages}
            alt={product.title}
            variant="detail"
          />

          {/* Details */}
          <div className="flex flex-col justify-center py-4 md:py-8">
            <Link
              href={`/stores/${store.slug}`}
              className="text-xs uppercase tracking-[0.2em] text-black/50 hover:text-black transition mb-3"
            >
              {store.name}
            </Link>

            <h1 className="text-3xl sm:text-4xl font-serif text-black leading-snug mb-3">
              {product.title}
            </h1>

            <p className="text-sm text-black/50 mb-1">{categoryLabel}</p>

            <div className="flex items-center gap-4 mb-8">
              <p className="text-2xl font-medium text-black">{price}</p>
              <FavoriteButton type="product" targetId={dbId} size="md" favoriteCount={favoriteCount} />
            </div>

            {/* Accordion details */}
            <div className="mb-8">
              <ProductAccordion
                sections={[
                  {
                    title: "Product Details",
                    content: product.description ? (
                      <div
                        className="product-description prose prose-sm max-w-none [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_strong]:text-black [&_h1]:text-lg [&_h1]:font-serif [&_h2]:text-base [&_h2]:font-serif [&_h3]:text-sm [&_h3]:font-medium [&_br]:block"
                        dangerouslySetInnerHTML={{ __html: product.description }}
                      />
                    ) : (
                      <p>Details not available for this item. Visit {store.name} for more information.</p>
                    ),
                  },
                  {
                    title: "Sizing & Measurements",
                    content: (
                      <div>
                        <p className="mb-3">
                          This is a vintage or secondhand item. Sizing may vary from modern standards.
                          We recommend checking measurements carefully before purchasing.
                        </p>
                        <p>
                          For specific measurements or sizing questions, contact{" "}
                          <a href={`/stores/${store.slug}`} className="underline hover:text-black transition">
                            {store.name}
                          </a>{" "}
                          directly.
                        </p>
                      </div>
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

            {/* Add to Cart */}
            {product.external_url ? (
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
                }}
              />
            ) : (
              <button
                disabled
                className="block w-full bg-neutral-300 text-white py-4 text-sm uppercase tracking-wide text-center cursor-not-allowed"
              >
                Coming Soon
              </button>
            )}

            <p className="text-[11px] text-black/40 mt-4">
              You&apos;ll complete your purchase on {store.name}&apos;s website.
            </p>
            <p className="text-[11px] text-black/40 mt-1">
              All sales are final.
            </p>

            <ProductQuestion
              productTitle={product.title}
              storeName={store.name}
              productUrl={`https://theviaplatform.com/products/${compositeId}`}
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
