export const dynamic = "force-dynamic";

import { getNewArrivals } from "@/app/lib/db";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { categoryMap } from "@/app/lib/categoryMap";
import MixedProductGrid from "@/app/components/MixedProductGrid";

export default async function NewArrivalsPage() {
  const products = await getNewArrivals(48, 7);

  const gridProducts = products.map((p) => ({
    ...p,
    categoryLabel: categoryMap[inferCategoryFromTitle(p.title)],
  }));

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <div className="flex items-center gap-4 mb-1">
            <p className="text-lg sm:text-xl font-serif italic text-[#5D0F17]/70">Just Added</p>
            <div className="flex-1 h-px bg-[#5D0F17]/15" />
          </div>
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-serif text-[#5D0F17]/10 leading-none -mt-2 mb-4">
            New Arrivals
          </h1>
          <p className="text-sm sm:text-base text-[#5D0F17]/60 max-w-2xl">
            The latest pieces added by our stores this week.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          {products.length === 0 ? (
            <p className="text-[#5D0F17]/50 text-sm">
              No new arrivals right now. Check back soon.
            </p>
          ) : (
            <MixedProductGrid products={gridProducts} from="/new-arrivals" />
          )}
        </div>
      </section>
    </main>
  );
}
