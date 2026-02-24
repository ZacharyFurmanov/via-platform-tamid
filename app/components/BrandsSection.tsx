import Link from "next/link";
import { getActiveBrands } from "@/app/lib/getActiveBrands";

export default async function BrandsSection() {
  const brands = await getActiveBrands();
  const topBrands = brands.slice(0, 12);

  if (topBrands.length === 0) return null;

  return (
    <section className="bg-white py-16 sm:py-24 border-t border-neutral-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-400 mb-3 sm:mb-4">
              Curated Selection
            </p>
            <h2 className="text-3xl sm:text-5xl font-serif text-black">
              Shop by Designer
            </h2>
          </div>

          <Link
            href="/brands"
            className="mt-4 sm:mt-0 text-sm uppercase tracking-wide link-underline min-h-[44px] flex items-center"
          >
            View all designers
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {topBrands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brands/${brand.slug}`}
              className="group block border border-neutral-200 p-6 sm:p-8 text-center hover:bg-black hover:border-black transition-all duration-300"
            >
              <h3 className="font-serif text-lg sm:text-xl text-black group-hover:text-white transition-colors duration-300">
                {brand.label}
              </h3>
              <p className="text-xs text-neutral-400 group-hover:text-neutral-300 mt-2 transition-colors duration-300">
                {brand.productCount} {brand.productCount === 1 ? "piece" : "pieces"}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
