export const dynamic = "force-dynamic";

import { getNewArrivals } from "@/app/lib/db";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { categoryMap } from "@/app/lib/categoryMap";
import MixedProductGrid from "@/app/components/MixedProductGrid";

export default async function NewArrivalsPage() {
  const products = await getNewArrivals(48, 14);

  const gridProducts = products.map((p) => ({
    ...p,
    categoryLabel: categoryMap[inferCategoryFromTitle(p.title)],
  }));

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
            <MixedProductGrid products={gridProducts} from="/new-arrivals" />
          )}
        </div>
      </section>
    </main>
  );
}
