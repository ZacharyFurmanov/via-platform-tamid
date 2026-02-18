export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getInventory } from "@/app/lib/inventory";
import { categories } from "@/app/lib/categories";
import { stores } from "@/app/lib/stores";
import FilteredProductGrid from "@/app/components/FilteredProductGrid";
import type { FilterableProduct } from "@/app/components/FilteredProductGrid";
import { getProductPopularityScores } from "@/app/lib/analytics-db";

export default async function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const category = (await params).category;

  // Validate category
  const categoryMeta = categories.find((c) => c.slug === category);
  if (!categoryMeta) {
    return notFound();
  }

  const inventory = await getInventory();

  // Filter inventory by category
  const categoryItems = inventory.filter((item) => item.category === category);

  // Extract DB IDs and fetch popularity scores
  const dbIdMap = new Map<string, number>();
  for (const item of categoryItems) {
    const match = item.id.match(/-(\d+)$/);
    if (match) dbIdMap.set(item.id, parseInt(match[1], 10));
  }
  const dbIds = Array.from(dbIdMap.values());
  const popularityScores = await getProductPopularityScores(dbIds);

  // Transform for FilteredProductGrid
  const filteredProducts: FilterableProduct[] = categoryItems.map((item, idx) => ({
    id: item.id,
    dbId: dbIdMap.get(item.id),
    title: item.title,
    price: item.price,
    category: item.category,
    categoryLabel: categoryMeta.label,
    store: item.store,
    storeSlug: item.storeSlug,
    externalUrl: item.externalUrl,
    image: item.image,
    images: item.images,
    createdAt: Date.now() - idx * 1000,
    popularityScore: popularityScores[dbIdMap.get(item.id) ?? 0] ?? 0,
  }));

  // Get stores for the filter
  const storeList = stores.map((s) => ({ slug: s.slug, name: s.name }));

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
            {categoryMeta.label}
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 max-w-2xl">
            Curated {categoryMeta.label.toLowerCase()} from independent vintage
            and resale stores.
          </p>
        </div>
      </section>

      {/* ================= PRODUCTS WITH FILTERS ================= */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <FilteredProductGrid
            products={filteredProducts}
            stores={storeList}
            from={`/categories/${category}`}
            emptyMessage="No products found in this category."
          />
        </div>
      </section>
    </main>
  );
}
