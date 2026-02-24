export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getInventory } from "@/app/lib/inventory";
import { categories, clothingSubcategories } from "@/app/lib/categories";
import { displayCategories, clothingSlugs, categoryMap } from "@/app/lib/categoryMap";
import type { CategorySlug } from "@/app/lib/categoryMap";
import { stores } from "@/app/lib/stores";
import FilteredProductGrid from "@/app/components/FilteredProductGrid";
import type { FilterableProduct } from "@/app/components/FilteredProductGrid";
import { getProductPopularityScores } from "@/app/lib/analytics-db";
import { computeProductScore } from "@/app/lib/productRanking";

export default async function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const category = (await params).category;

  // Check if it's a display category (clothing, bags, shoes, accessories)
  const displayMeta = displayCategories.find((c) => c.slug === category);
  // Or a direct subcategory slug
  const subcategoryMeta = categories.find((c) => c.slug === category);

  if (!displayMeta && !subcategoryMeta) {
    return notFound();
  }

  const label = displayMeta?.label ?? subcategoryMeta!.label;
  const isClothing = category === "clothing";

  const inventory = await getInventory();

  // Filter inventory: "clothing" matches all clothing subcategories, others match exact slug
  const categoryItems = isClothing
    ? inventory.filter((item) => clothingSlugs.has(item.category))
    : inventory.filter((item) => item.category === category);

  // Extract DB IDs and fetch popularity scores
  const dbIdMap = new Map<string, number>();
  for (const item of categoryItems) {
    const match = item.id.match(/-(\d+)$/);
    if (match) dbIdMap.set(item.id, parseInt(match[1], 10));
  }
  const dbIds = Array.from(dbIdMap.values());
  const popularityScores = await getProductPopularityScores(dbIds);

  // Transform for FilteredProductGrid with composite ranking
  const filteredProducts: FilterableProduct[] = categoryItems.map((item) => {
    const engagementScore = popularityScores[dbIdMap.get(item.id) ?? 0] ?? 0;
    const syncedAt = item.syncedAt ?? new Date().toISOString();

    return {
      id: item.id,
      dbId: dbIdMap.get(item.id),
      title: item.title,
      price: item.price,
      category: item.category,
      categoryLabel: categoryMap[item.category as CategorySlug],
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

  // Show subcategory filters on the clothing page
  const clothingFilterCategories = clothingSubcategories.map((c) => ({
    slug: c.slug,
    label: c.label,
  }));

  // Compute brand/designer counts for this category
  const brandCounts: { label: string; count: number }[] = [];
  const brandCountMap = new Map<string, number>();
  for (const p of filteredProducts) {
    if (p.brandLabel) {
      brandCountMap.set(p.brandLabel, (brandCountMap.get(p.brandLabel) || 0) + 1);
    }
  }
  for (const [bl, count] of brandCountMap) {
    brandCounts.push({ label: bl, count });
  }
  brandCounts.sort((a, b) => b.count - a.count);

  // Compute store counts for this category
  const storeCounts: { label: string; count: number }[] = [];
  const storeCountMap = new Map<string, number>();
  for (const p of filteredProducts) {
    storeCountMap.set(p.store, (storeCountMap.get(p.store) || 0) + 1);
  }
  for (const [sl, count] of storeCountMap) {
    storeCounts.push({ label: sl, count });
  }
  storeCounts.sort((a, b) => b.count - a.count);

  return (
    <main className="bg-white min-h-screen text-black">
      {/* ================= CATEGORY HEADER ================= */}
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <Link
            href="/categories"
            className="inline-block mb-6 text-xs tracking-[0.25em] uppercase text-neutral-500 hover:text-black transition"
          >
            &larr; All Categories
          </Link>
          <div className="flex items-center gap-4 mb-1">
            <p className="text-lg sm:text-xl font-serif italic text-black/80">Shop</p>
            <div className="flex-1 h-px bg-neutral-200" />
          </div>
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-serif text-black/10 leading-none -mt-2 mb-4">
            {label}
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 max-w-2xl">
            Curated {label.toLowerCase()} from independent vintage
            and secondhand stores.
          </p>

          {/* Store pills */}
          {storeCounts.length > 0 && (
            <div className="mt-6 overflow-x-auto scrollbar-hide -mx-6 px-6">
              <div className="flex gap-2">
                {storeCounts.map((s) => (
                  <span
                    key={s.label}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-100 text-xs uppercase tracking-[0.1em] text-black/70 whitespace-nowrap rounded-full"
                  >
                    {s.label}
                    <span className="text-black/40">{s.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Designer pills */}
          {brandCounts.length > 0 && (
            <div className="mt-3 overflow-x-auto scrollbar-hide -mx-6 px-6">
              <div className="flex gap-2">
                {brandCounts.map((brand) => (
                  <span
                    key={brand.label}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-neutral-200 text-xs uppercase tracking-[0.1em] text-black/70 whitespace-nowrap rounded-full"
                  >
                    {brand.label}
                    <span className="text-black/40">{brand.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================= PRODUCTS WITH FILTERS ================= */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <FilteredProductGrid
            products={filteredProducts}
            stores={storeList}
            categories={isClothing ? clothingFilterCategories : []}
            showCategoryFilter={isClothing}
            from={`/categories/${category}`}
            emptyMessage="No products found in this category."
          />
        </div>
      </section>
    </main>
  );
}
