export const dynamic = "force-dynamic";

import Link from "next/link";
import { getInventory } from "@/app/lib/inventory";
import { stores } from "@/app/lib/stores";
import { categories } from "@/app/lib/categories";
import { categoryMap } from "@/app/lib/categoryMap";
import FilteredProductGrid from "@/app/components/FilteredProductGrid";
import type { FilterableProduct } from "@/app/components/FilteredProductGrid";
import { getProductPopularityScores } from "@/app/lib/analytics-db";
import { computeProductScore } from "@/app/lib/productRanking";

export default async function BrowsePage() {
  const inventory = await getInventory();

  // Extract DB IDs and fetch popularity scores
  const dbIdMap = new Map<string, number>();
  for (const item of inventory) {
    const match = item.id.match(/-(\d+)$/);
    if (match) dbIdMap.set(item.id, parseInt(match[1], 10));
  }
  const dbIds = Array.from(dbIdMap.values());
  const popularityScores = await getProductPopularityScores(dbIds);

  // Transform inventory with composite ranking scores
  const products: FilterableProduct[] = inventory.map((item) => {
    const engagementScore = popularityScores[dbIdMap.get(item.id) ?? 0] ?? 0;
    const syncedAt = item.syncedAt ?? new Date().toISOString();

    return {
      id: item.id,
      dbId: dbIdMap.get(item.id),
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
      createdAt: syncedAt ? new Date(syncedAt).getTime() : Date.now(),
      popularityScore: computeProductScore({
        engagementScore,
        syncedAt,
        imageCount: item.images.length,
        brandSlug: item.brand,
        price: item.price,
        title: item.title,
      }),
    };
  });

  // Get stores for the filter
  const storeList = stores.map((s) => ({ slug: s.slug, name: s.name }));

  // Get categories for the filter
  const categoryList = categories.map((c) => ({ slug: c.slug, label: c.label }));

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      {/* ================= HERO ================= */}
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">Browse All</h1>
          <p className="text-sm sm:text-base text-[#5D0F17]/60 max-w-2xl">
            Discover curated vintage and secondhand from our network of independent stores.
          </p>
        </div>
      </section>

      {/* ================= PRODUCTS WITH FILTERS ================= */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <FilteredProductGrid
            products={products}
            stores={storeList}
            categories={categoryList}
            showCategoryFilter={true}
            showBrandFilter={true}
            from="/browse"
            emptyMessage="No products found. Check back soon for new arrivals."
          />
        </div>
      </section>
    </main>
  );
}
