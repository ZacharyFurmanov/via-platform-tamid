import Link from "next/link";
import { getActiveBrands } from "@/app/lib/getActiveBrands";

export default async function BrandsSection() {
  const brands = await getActiveBrands();
  const topBrands = brands.slice(0, 12);

  if (topBrands.length === 0) return null;

  return (
    <section className="bg-[#F7F3EA] py-16 sm:py-24 border-t border-[#5D0F17]/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-10 sm:mb-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-1">Shop by</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#5D0F17]">Designer</h2>
          </div>
          <Link
            href="/brands"
            className="text-sm uppercase tracking-[0.15em] text-[#5D0F17] hover:text-[#5D0F17]/60 transition-colors min-h-[44px] flex items-center"
          >
            Shop All Designers
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {topBrands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brands/${brand.slug}`}
              className="group block border border-[#5D0F17]/20 p-6 sm:p-8 text-center hover:bg-[#5D0F17] hover:border-[#5D0F17] transition-all duration-300"
            >
              <h3 className="font-serif text-lg sm:text-xl text-[#5D0F17] group-hover:text-[#F7F3EA] transition-colors duration-300">
                {brand.label}
              </h3>
              <p className="text-xs text-[#5D0F17]/50 group-hover:text-[#F7F3EA]/70 mt-2 transition-colors duration-300">
                {brand.productCount} {brand.productCount === 1 ? "piece" : "pieces"}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
