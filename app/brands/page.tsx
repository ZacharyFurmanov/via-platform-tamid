export const dynamic = "force-dynamic";

import Link from "next/link";
import { getActiveBrands } from "@/app/lib/getActiveBrands";

export default async function BrandsPage() {
  const brands = await getActiveBrands();

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      {/* ================= HEADER ================= */}
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">Shop by Designer</h1>
          <p className="text-sm sm:text-base text-[#5D0F17]/60 max-w-2xl">
            Browse vintage and secondhand pieces from the world&apos;s most sought-after designers.
          </p>
        </div>
      </section>

      {/* ================= BRANDS GRID ================= */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {brands.map((brand) => (
              <Link
                key={brand.slug}
                href={`/brands/${brand.slug}`}
                className="group block border border-[#5D0F17]/20 p-4 sm:p-8 text-center hover:bg-[#5D0F17] hover:border-[#5D0F17] transition-all duration-300"
              >
                <h2 className="font-serif text-lg sm:text-xl text-[#5D0F17] group-hover:text-[#F7F3EA] transition-colors duration-300">
                  {brand.label}
                </h2>
                <p className="text-xs text-[#5D0F17]/40 group-hover:text-[#F7F3EA]/60 mt-2 transition-colors duration-300">
                  {brand.productCount} {brand.productCount === 1 ? "piece" : "pieces"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
