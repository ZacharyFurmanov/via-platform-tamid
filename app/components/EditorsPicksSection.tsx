import { getAllEditorsPicks } from "@/app/lib/editors-picks-db";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { categoryMap } from "@/app/lib/categoryMap";
import ProductCard from "./ProductCard";
import Link from "next/link";

export default async function EditorsPicksSection() {
  const picks = await getAllEditorsPicks();

  if (picks.length === 0) return null;

  return (
    <section className="bg-[#F7F3EA] pt-16 pb-20 sm:pt-24 sm:pb-28 border-t border-[#5D0F17]/10">
      <div className="max-w-7xl mx-auto">
        <div className="px-6 mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-1 font-sans">Curated</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#5D0F17]">Editor&apos;s Picks</h2>
            </div>
            <Link
              href="/editors-picks"
              className="text-sm uppercase tracking-[0.15em] text-[#5D0F17] hover:text-[#5D0F17]/60 transition-colors min-h-[44px] flex items-center font-sans"
            >
              View All Picks
            </Link>
          </div>
        </div>

        {/* Infinite marquee — items duplicated for seamless loop */}
        <div className="overflow-hidden marquee-container [&_img]:select-none [&_img]:pointer-events-none">
          <div className="marquee-track flex gap-3 sm:gap-4" style={{ width: "max-content" }}>
            {[0, 1].map((setIndex) =>
              picks.map((pick) => {
                const categorySlug = inferCategoryFromTitle(pick.product.title);
                const categoryLabel = categoryMap[categorySlug];
                const compositeId = `${pick.product.storeSlug}-${pick.product.id}`;
                const images: string[] = pick.product.images
                  ? JSON.parse(pick.product.images)
                  : [];

                return (
                  <div
                    key={`${setIndex}-${pick.pickId}`}
                    className="w-[44vw] sm:w-56 md:w-60 flex-shrink-0"
                    aria-hidden={setIndex === 1 ? true : undefined}
                  >
                    <ProductCard
                      id={compositeId}
                      dbId={pick.product.id}
                      name={pick.product.title}
                      price={`$${Math.round(Number(pick.product.price))}`}
                      category={categoryLabel}
                      storeName={pick.product.storeName}
                      storeSlug={pick.product.storeSlug}
                      image={pick.product.image || ""}
                      images={images}
                      size={pick.product.size}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
