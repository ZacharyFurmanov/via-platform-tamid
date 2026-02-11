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
                  <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden mb-6 flex items-center justify-center">
                    <span className="text-xl sm:text-2xl font-serif text-neutral-400 group-hover:text-neutral-600 transition-colors duration-300 text-center px-4">
                      {brand.label}
                    </span>
                  </div>
                  <h2 className="text-lg font-serif group-hover:underline underline-offset-4">
                    {brand.label}
                  </h2>
                  <p className="text-sm text-neutral-500 mt-1">
                    {brand.productCount} piece{brand.productCount !== 1 ? "s" : ""}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </section>
    </main>
  );
}
