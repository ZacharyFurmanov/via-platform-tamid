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
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">
            {label}
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 max-w-2xl">
            Curated {label.toLowerCase()} from independent vintage
            and secondhand stores.
          </p>
        </div>
      </section>

      {/* ================= PRODUCTS WITH FILTERS ================= */}
      <section className="py-24">
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
