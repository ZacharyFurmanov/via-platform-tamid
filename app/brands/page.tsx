export const dynamic = "force-dynamic";

import Link from "next/link";
import { getActiveBrands } from "@/app/lib/getActiveBrands";
import Container from "@/app/components/container";

export default async function BrandsPage() {
  const brands = await getActiveBrands();

  return (
    <main className="bg-white min-h-screen">
      {/* ================= HEADER ================= */}
      <section className="border-b border-neutral-200">
        <Container>
          <div className="py-28">
            <h1 className="text-5xl sm:text-6xl font-serif mb-6">
              Shop by Brand
            </h1>
            <p className="text-neutral-600 text-lg max-w-2xl">
              Discover curated vintage and resale from the world's most coveted designers.
            </p>
          </div>
        </Container>
      </section>

      {/* ================= BRAND GRID ================= */}
      <section className="py-32">
        <Container>
          {brands.length === 0 ? (
            <p className="text-neutral-500">Brands coming soon.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-10 gap-y-16">
              {brands.map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/brands/${brand.slug}`}
                  className="group"
                >
                  <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden flex flex-col items-center justify-center px-4 group-hover:bg-neutral-200/70 transition-colors duration-300">
                    <span className="text-xl sm:text-2xl font-serif text-black text-center leading-snug">
                      {brand.label}
                    </span>
                    <span className="text-xs text-neutral-500 mt-2">
                      {brand.productCount} piece{brand.productCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </section>
    </main>
  );
}
