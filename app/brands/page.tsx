export const dynamic = "force-dynamic";

import { getInventory } from "@/app/lib/inventory";
import { stores } from "@/app/lib/stores";
import { categories } from "@/app/lib/categories";
import { categoryMap } from "@/app/lib/categoryMap";
import FilteredProductGrid from "@/app/components/FilteredProductGrid";
import type { FilterableProduct } from "@/app/components/FilteredProductGrid";

export default async function BrandsPage() {
  const inventory = await getInventory();

  const products: FilterableProduct[] = inventory.map((item, idx) => ({
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
  const categoryList = categories.map((c) => ({ slug: c.slug, label: c.label }));

  return (
    <main className="bg-white min-h-screen text-black">
      <section className="bg-[#f7f6f3] py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-4">
            Explore
          </p>
          <h1 className="text-5xl sm:text-6xl font-serif mb-6">
            Shop by Brand
          </h1>
          <p className="text-lg text-neutral-700 max-w-2xl mx-auto">
            Discover curated vintage and resale from the world's most coveted designers.
          </p>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <FilteredProductGrid
            products={products}
            stores={storeList}
            categories={categoryList}
            showCategoryFilter={true}
            showBrandFilter={true}
            emptyMessage="No products found. Check back soon for new arrivals."
          />
        </div>
      </section>
    </main>
  );
}
