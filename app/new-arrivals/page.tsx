export const dynamic = "force-dynamic";

import { getNewArrivals } from "@/app/lib/db";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { categoryMap } from "@/app/lib/categoryMap";
import { deriveSize } from "@/app/lib/inventory";
import ProductCard from "@/app/components/ProductCard";
export default async function NewArrivalsPage() {
  const products = await getNewArrivals(500, 7);

  const gridProducts = products.map((p) => ({
    ...p,
    categoryLabel: categoryMap[inferCategoryFromTitle(p.title)],
    size: deriveSize(p),
    images: p.images ? JSON.parse(p.images) as string[] : [],
  }));

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">New Arrivals</h1>
          <p className="text-sm sm:text-base text-[#5D0F17]/60 max-w-2xl">
            The latest pieces added by our stores this week.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          {gridProducts.length === 0 ? (
            <p className="text-[#5D0F17]/50 text-sm">
              No new arrivals right now. Check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {gridProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  id={`${product.store_slug}-${product.id}`}
                  dbId={product.id}
                  name={product.title}
                  price={`$${Math.round(Number(product.price))}`}
                  category={product.categoryLabel}
                  storeName={product.store_name}
                  storeSlug={product.store_slug}
                  image={product.image || ""}
                  images={product.images}
                  size={product.size}
                  from="new-arrivals"
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
