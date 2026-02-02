import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductById } from "@/app/lib/db";
import { stores } from "@/app/lib/stores";
import { categoryMap } from "@/app/lib/categoryMap";
import { createTrackingUrl } from "@/app/lib/track";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";

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

  const trackingUrl = product.external_url
    ? createTrackingUrl(
        compositeId,
        product.title,
        product.store_name,
        product.store_slug,
        product.external_url
      )
    : null;

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
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
            <img
              src={product.image || "/placeholder.jpg"}
              alt={product.title}
              className="w-full h-full object-cover object-top"
            />
            {!product.image && (
              <div className="absolute inset-0 bg-neutral-200" />
            )}
          </div>

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

            <p className="text-2xl font-medium text-black mb-8">{price}</p>

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
    </main>
  );
}
