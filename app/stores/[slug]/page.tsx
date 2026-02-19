import { notFound } from "next/navigation";
import Link from "next/link";
import { stores } from "@/app/lib/stores";
import { loadStoreProducts } from "@/app/lib/loadStoreProducts";
import { StoreProduct } from "@/app/lib/types";
import { categoryMap } from "@/app/lib/categoryMap";
import FilteredProductGrid from "@/app/components/FilteredProductGrid";
import type { FilterableProduct } from "@/app/components/FilteredProductGrid";
import FavoriteButton from "@/app/components/FavoriteButton";
import { getProductPopularityScores } from "@/app/lib/analytics-db";
import { computeProductScore } from "@/app/lib/productRanking";
import { inferBrandFromTitle } from "@/app/lib/loadStoreProducts";
import { brandMap } from "@/app/lib/brandData";

type StorePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

// Helper to parse price string to number
function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;

  const store = stores.find((s) => s.slug === slug);
  if (!store) return notFound();

  const storeProducts: StoreProduct[] = await loadStoreProducts(slug);

  // Extract DB IDs from composite IDs (format: store_slug-dbId)
  const dbIdMap = new Map<string, number>();
  for (const product of storeProducts) {
    const match = product.id.match(/-(\d+)$/);
    if (match) dbIdMap.set(product.id, parseInt(match[1], 10));
  }

  // Fetch popularity scores
  const dbIds = Array.from(dbIdMap.values());
  const popularityScores = await getProductPopularityScores(dbIds);

  // Transform to FilterableProduct format with composite ranking
  const products: FilterableProduct[] = storeProducts.map((product) => {
    const price = parsePrice(product.price);
    const images = product.images ?? [];
    const brandSlug = inferBrandFromTitle(product.name);
    const engagementScore = popularityScores[dbIdMap.get(product.id) ?? 0] ?? 0;
    const syncedAt = product.syncedAt ?? new Date().toISOString();

    return {
      id: product.id,
      dbId: dbIdMap.get(product.id),
      title: product.name,
      price,
      category: product.category,
      categoryLabel: categoryMap[product.category as keyof typeof categoryMap],
      brand: brandSlug,
      brandLabel: brandSlug ? (brandMap[brandSlug] ?? null) : null,
      store: store.name,
      storeSlug: store.slug,
      externalUrl: product.externalUrl,
      image: product.image ?? "",
      images,
      createdAt: syncedAt ? new Date(syncedAt).getTime() : Date.now(),
      popularityScore: computeProductScore({
        engagementScore,
        syncedAt,
        imageCount: images.length,
        brandSlug,
        price,
        title: product.name,
      }),
    };
  });

  return (
    <main className="bg-white min-h-screen">
      {/* ================= STORE HEADER ================= */}
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <Link
            href="/stores"
            className="inline-block mb-6 text-xs tracking-[0.25em] uppercase text-neutral-500 hover:text-black transition"
          >
            &larr; All Stores
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-serif">{store.name}</h1>
            <FavoriteButton type="store" targetId={store.slug} size="md" />
          </div>

          <p className="text-sm text-neutral-500 mb-3">{store.location}</p>

          {store.description && (
            <p className="text-sm sm:text-base text-neutral-600 max-w-xl">{store.description}</p>
          )}

          {"perk" in store && store.perk && (
            <p className="mt-4 text-sm font-medium text-black italic">
              {store.perk}
            </p>
          )}
        </div>
      </section>

      {/* ================= PRODUCTS WITH FILTERS ================= */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <FilteredProductGrid
            products={products}
            stores={[{ slug: store.slug, name: store.name }]}
            showCategoryFilter
            showBrandFilter
            emptyMessage="Products coming soon."
          />
        </div>
      </section>
    </main>
  );
}
