import Link from "next/link";
import { getActiveBrands } from "@/app/lib/getActiveBrands";

export default async function BrandsSection() {
  const brands = await getActiveBrands();
  const topBrands = brands.slice(0, 12);

  if (topBrands.length === 0) return null;

  return (
    <section className="bg-[#F7F3EA] py-16 sm:py-24 border-t border-[#5D0F17]/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-10 sm:mb-14">
          <div className="flex items-center gap-4 mb-1">
            <p className="text-lg sm:text-xl font-serif italic text-[#5D0F17]/70">Shop by</p>
            <div className="flex-1 h-px bg-[#5D0F17]/15" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-5xl sm:text-7xl md:text-8xl font-serif text-[#5D0F17]/10 leading-none -mt-2">
              Designer
            </h2>
            <Link
              href="/brands"
              className="mt-2 sm:mt-0 text-sm uppercase tracking-[0.15em] text-[#5D0F17] hover:text-[#5D0F17]/60 transition-colors min-h-[44px] flex items-center"
            >
              Shop All Designers
            </Link>
          </div>
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
