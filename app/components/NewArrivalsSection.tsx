import { getNewArrivals } from "@/app/lib/db";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { categoryMap } from "@/app/lib/categoryMap";
import ProductCard from "./ProductCard";
import Link from "next/link";

export default async function NewArrivalsSection() {
  const products = await getNewArrivals(12, 7);

  if (products.length === 0) return null;

  return (
    <section id="new-arrivals" className="bg-[#F7F3EA] pt-16 pb-20 sm:pt-24 sm:pb-28 border-t border-[#5D0F17]/10">
      <div className="max-w-7xl mx-auto">
        <div className="px-6 mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-1">Just Added</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#5D0F17]">New Arrivals</h2>
            </div>
            <Link
              href="/new-arrivals"
              className="text-sm uppercase tracking-[0.15em] text-[#5D0F17] hover:text-[#5D0F17]/60 transition-colors min-h-[44px] flex items-center"
            >
              Shop New Arrivals
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto pb-4 scrollbar-hide touch-pan-x [&_img]:select-none [&_img]:pointer-events-none">
          <div className="flex gap-3 sm:gap-4 pl-6 pr-6">
            {products.map((product) => {
              const categorySlug = inferCategoryFromTitle(product.title);
              const categoryLabel = categoryMap[categorySlug];
              const compositeId = `${product.store_slug}-${product.id}`;
              const images: string[] = product.images
                ? JSON.parse(product.images)
                : [];

              return (
                <div key={product.id} className="w-[40vw] sm:w-[22vw] md:w-[18vw] flex-shrink-0">
                  <ProductCard
                    id={compositeId}
                    dbId={product.id}
                    name={product.title}
                    price={`$${Math.round(Number(product.price))}`}
                    category={categoryLabel}
                    storeName={product.store_name}
                    storeSlug={product.store_slug}
                    image={product.image || ""}
                    images={images}
                    size={product.size}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
