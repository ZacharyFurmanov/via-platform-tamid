export const dynamic = "force-dynamic";

import { getInventory } from "@/app/lib/inventory";
import { stores } from "@/app/lib/stores";
import { displayCategories, clothingSlugs, categoryMap } from "@/app/lib/categoryMap";
import type { CategorySlug } from "@/app/lib/categoryMap";
import FilteredProductGrid from "@/app/components/FilteredProductGrid";
import type { FilterableProduct } from "@/app/components/FilteredProductGrid";

// Map product subcategories to display categories for filtering
function toDisplayCategory(slug: CategorySlug): string {
  return clothingSlugs.has(slug) ? "clothing" : slug;
}

export default async function CategoriesPage() {
  const inventory = await getInventory();

  const products: FilterableProduct[] = inventory.map((item, idx) => {
    const displaySlug = toDisplayCategory(item.category);
    const displayLabel = displayCategories.find((c) => c.slug === displaySlug)?.label
      ?? categoryMap[item.category as CategorySlug];
    return {
      id: item.id,
      title: item.title,
      price: item.price,
      category: displaySlug,
      categoryLabel: displayLabel,
      brand: item.brand,
      brandLabel: item.brandLabel,
      store: item.store,
      storeSlug: item.storeSlug,
      externalUrl: item.externalUrl,
      image: item.image,
      images: item.images,
      createdAt: Date.now() - idx * 1000,
    };
  });

  const storeList = stores.map((s) => ({ slug: s.slug, name: s.name }));
  const categoryList = displayCategories.map((c) => ({ slug: c.slug, label: c.label }));

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <div className="flex items-center gap-4 mb-1">
            <p className="text-lg sm:text-xl font-serif italic text-[#5D0F17]/70">Shop by</p>
            <div className="flex-1 h-px bg-[#5D0F17]/15" />
          </div>
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-serif text-[#5D0F17]/10 leading-none -mt-2 mb-4">
            Category
          </h1>
          <p className="text-sm sm:text-base text-[#5D0F17]/60 max-w-2xl">
            Browse curated vintage and secondhand across our most-loved categories.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-24">
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
