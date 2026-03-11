export const dynamic = "force-dynamic";

import { getInventory } from "@/app/lib/inventory";
import { stores } from "@/app/lib/stores";
import { displayCategories, clothingSlugs, categoryMap } from "@/app/lib/categoryMap";
import type { CategorySlug } from "@/app/lib/categoryMap";
import FilteredProductGrid from "@/app/components/FilteredProductGrid";
import type { FilterableProduct } from "@/app/components/FilteredProductGrid";
import { getProductPopularityScores } from "@/app/lib/analytics-db";
import { computeProductScore } from "@/app/lib/productRanking";
import { auth } from "@/app/lib/auth";
import { getUserMembershipStatus } from "@/app/lib/membership-db";

// Map product subcategories to display categories for filtering
function toDisplayCategory(slug: CategorySlug): string {
  return clothingSlugs.has(slug) ? "clothing" : slug;
}

export default async function CategoriesPage() {
  const session = await auth();
  const isMember = session?.user?.id
    ? await getUserMembershipStatus(session.user.id).then((s) => s.isMember).catch(() => false)
    : false;

  const inventory = await getInventory(isMember);

  const dbIdMap = new Map<string, number>();
  for (const item of inventory) {
    const match = item.id.match(/-(\d+)$/);
    if (match) dbIdMap.set(item.id, parseInt(match[1], 10));
  }
  const dbIds = Array.from(dbIdMap.values());
  const popularityScores = await getProductPopularityScores(dbIds);

  const products: FilterableProduct[] = inventory.map((item) => {
    const engagementScore = popularityScores[dbIdMap.get(item.id) ?? 0] ?? 0;
    const syncedAt = item.syncedAt ?? new Date().toISOString();
    const displaySlug = toDisplayCategory(item.category);
    const displayLabel = displayCategories.find((c) => c.slug === displaySlug)?.label
      ?? categoryMap[item.category as CategorySlug];

    return {
      id: item.id,
      dbId: dbIdMap.get(item.id),
      title: item.title,
      price: item.price,
      compareAtPrice: item.compareAtPrice,
      category: displaySlug,
      categoryLabel: displayLabel,
      brand: item.brand,
      brandLabel: item.brandLabel,
      store: item.store,
      storeSlug: item.storeSlug,
      externalUrl: item.externalUrl,
      image: item.image,
      images: item.images,
      engagementScore,
      createdAt: item.createdAt ? new Date(item.createdAt).getTime() : (dbIdMap.get(item.id) ?? 0),
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

  const storeList = stores.map((s) => ({ slug: s.slug, name: s.name }));
  const categoryList = displayCategories.map((c) => ({ slug: c.slug, label: c.label }));

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">Shop by Category</h1>
          <p className="text-sm sm:text-base text-[#5D0F17]/60 max-w-2xl">
            Browse vintage and secondhand across our most-loved categories.
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
