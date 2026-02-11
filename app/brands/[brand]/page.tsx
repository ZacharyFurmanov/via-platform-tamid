export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getInventory } from "@/app/lib/inventory";
import { brands } from "@/app/lib/brandData";
import { categoryMap } from "@/app/lib/categoryMap";
import { stores } from "@/app/lib/stores";
import FilteredProductGrid from "@/app/components/FilteredProductGrid";
import type { FilterableProduct } from "@/app/components/FilteredProductGrid";

export default async function BrandPage({
  params,
}: {
  params: { brand: string };
}) {
  const brandSlug = (await params).brand;

  const brandMeta = brands.find((b) => b.slug === brandSlug);
  if (!brandMeta) return notFound();

  const inventory = await getInventory();

  const filteredProducts: FilterableProduct[] = inventory
    .filter((item) => item.brand === brandSlug)
    .map((item, idx) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      category: item.category,
      categoryLabel: categoryMap[item.category as keyof typeof categoryMap],
      brand: item.brand,
      brandLabel: item.brandLabel,
      store: item.store,
      storeSlug: item.storeSlug,
      externalUrl: item.externalUrl,
      image: item.image,
      images: item.images,
      createdAt: Date.now() - idx * 1000,
    }));

  const storeList = stores.map((s) => ({ slug: s.slug, name: s.name }));

  return (
    <main className="bg-white min-h-screen text-black">
      <section className="bg-[#f7f6f3] py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-4">
            Brand
          </p>
          <h1 className="text-5xl sm:text-6xl font-serif mb-6">
            {brandMeta.label}
          </h1>
          <p className="text-lg text-neutral-700 max-w-2xl mx-auto">
            Curated {brandMeta.label} pieces from independent vintage and resale stores.
          </p>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-3xl font-serif">Available pieces</h2>
            <Link
              href="/brands"
              className="text-sm uppercase tracking-wide underline hover:no-underline"
            >
              Back to brands
            </Link>
          </div>

          <FilteredProductGrid
            products={filteredProducts}
            stores={storeList}
            showCategoryFilter={true}
            emptyMessage={`No ${brandMeta.label} products found.`}
          />
        </div>
      </section>
    </main>
  );
}
