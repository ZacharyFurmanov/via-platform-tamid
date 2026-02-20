export const dynamic = "force-dynamic";

import { getNewArrivals } from "@/app/lib/db";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { categoryMap } from "@/app/lib/categoryMap";
import ProductCard from "@/app/components/ProductCard";

export default async function NewArrivalsPage() {
  const products = await getNewArrivals(48, 14);

  return (
    <main className="bg-white min-h-screen text-black">
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">
            New Arrivals
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 max-w-2xl">
            The latest pieces added by our stores in the past two weeks.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          {products.length === 0 ? (
            <p className="text-neutral-500 text-sm">
              No new arrivals right now. Check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
              {products.map((product) => {
                const categorySlug = inferCategoryFromTitle(product.title);
                const categoryLabel = categoryMap[categorySlug];
                const compositeId = `${product.store_slug}-${product.id}`;
                const images: string[] = product.images
                  ? JSON.parse(product.images)
                  : [];

                return (
                  <ProductCard
                    key={product.id}
                    id={compositeId}
                    dbId={product.id}
                    name={product.title}
                    price={`$${Math.round(Number(product.price))}`}
                    category={categoryLabel}
                    storeName={product.store_name}
                    storeSlug={product.store_slug}
                    image={product.image || ""}
                    images={images}
                    from="/new-arrivals"
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
