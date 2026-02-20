import { getNewArrivals } from "@/app/lib/db";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { categoryMap } from "@/app/lib/categoryMap";
import MixedProductGrid from "./MixedProductGrid";
import Link from "next/link";

export default async function NewArrivalsSection() {
  const products = await getNewArrivals(10, 7);

  if (products.length === 0) return null;

  const gridProducts = products.map((p) => ({
    ...p,
    categoryLabel: categoryMap[inferCategoryFromTitle(p.title)],
  }));

  return (
    <section id="new-arrivals" className="bg-neutral-100 pt-16 pb-20 sm:pt-24 sm:pb-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6 sm:mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-2 sm:mb-3">
              Just Added
            </p>
            <h2 className="text-2xl sm:text-5xl font-serif text-black">
              New Arrivals
            </h2>
          </div>

          <Link
            href="/new-arrivals"
            className="mt-3 sm:mt-0 text-sm uppercase tracking-wide link-underline"
          >
            Shop new arrivals
          </Link>
        </div>

        <MixedProductGrid products={gridProducts} />
      </div>
    </section>
  );
}
