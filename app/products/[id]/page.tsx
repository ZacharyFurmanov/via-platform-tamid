import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductById, getRecommendedProducts } from "@/app/lib/db";
import { stores } from "@/app/lib/stores";
import { categoryMap } from "@/app/lib/categoryMap";
import { createTrackingUrl } from "@/app/lib/track";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import ImageCarousel from "@/app/components/ImageCarousel";
import FavoriteButton from "@/app/components/FavoriteButton";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { id: compositeId } = await params;

  // Parse the DB integer ID from composite format: "store-slug-123"
  const match = compositeId.match(/^(.+)-(\d+)$/);
  if (!match) return notFound();

  const storeSlug = match[1];
  const dbId = parseInt(match[2], 10);
  if (isNaN(dbId)) return notFound();

  const product = await getProductById(dbId);
  if (!product) return notFound();

  const store = stores.find((s) => s.slug === storeSlug) ?? {
    slug: product.store_slug,
    name: product.store_name,
    location: "",
  };

  const categorySlug = inferCategoryFromTitle(product.title);
  const categoryLabel = categoryMap[categorySlug];
  const price = `$${Number(product.price)}`;

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

  const trackingUrl = product.external_url
    ? createTrackingUrl(
        compositeId,
        product.title,
        product.store_name,
        product.store_slug,
        product.external_url
      )
    : null;

  // Fetch recommended products from the same category
  const allCandidates = await getRecommendedProducts(dbId, 30);
  const recommendations = allCandidates
    .filter((p) => inferCategoryFromTitle(p.title) === categorySlug)
    .slice(0, 4);

  // If not enough same-category products, backfill with others
  if (recommendations.length < 4) {
    const remaining = allCandidates
      .filter(
        (p) =>
          inferCategoryFromTitle(p.title) !== categorySlug &&
          !recommendations.some((r) => r.id === p.id)
      )
      .slice(0, 4 - recommendations.length);
    recommendations.push(...remaining);
  }

  return (
    <main className="bg-white min-h-screen">
      {/* Back nav */}
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <Link
          href={`/stores/${store.slug}`}
          className="inline-block text-xs tracking-[0.25em] uppercase text-neutral-500 hover:text-black transition"
        >
          &larr; {store.name}
        </Link>
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
              <FavoriteButton type="product" targetId={dbId} size="md" />
            </div>

            {/* Description / product details */}
            {product.description && (
              <div
                className="prose prose-sm max-w-none mb-8 text-black/70 leading-relaxed [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_strong]:text-black [&_h1]:text-lg [&_h1]:font-serif [&_h2]:text-base [&_h2]:font-serif [&_h3]:text-sm [&_h3]:font-medium [&_br]:block"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}

            {/* Checkout */}
            {trackingUrl ? (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-black text-white py-4 text-sm uppercase tracking-wide text-center hover:bg-neutral-800 transition"
              >
                Checkout
              </a>
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
                const recPrice = `$${Number(rec.price)}`;
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
