import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/app/lib/auth";
import { getUserFavoritedProducts } from "@/app/lib/favorites-db";
import { categoryMap } from "@/app/lib/categoryMap";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { getProductPopularityScores } from "@/app/lib/analytics-db";
import { computeProductScore } from "@/app/lib/productRanking";
import { stores } from "@/app/lib/stores";
import FilteredProductGrid from "@/app/components/FilteredProductGrid";
import type { FilterableProduct } from "@/app/components/FilteredProductGrid";

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id!;

  let favEntries: Awaited<ReturnType<typeof getUserFavoritedProducts>> = [];

  try {
    favEntries = await getUserFavoritedProducts(userId);
  } catch (err) {
    console.error("Failed to load favorites:", err);
  }

  // Build dbIdMap for live products
  const dbIdMap = new Map<string, number>();
  for (const entry of favEntries) {
    if (!entry.soldOut && entry.product) {
      const compositeId = `${entry.product.store_slug}-${entry.product.id}`;
      dbIdMap.set(compositeId, entry.product.id);
    }
  }

  const dbIds = Array.from(dbIdMap.values());
  const popularityScores = dbIds.length > 0 ? await getProductPopularityScores(dbIds) : {};

  // Transform into FilterableProduct[]
  const products: FilterableProduct[] = favEntries
    .map((entry) => {
      if (entry.soldOut) {
        const snap = entry.snapshot;
        if (!snap) return null;
        const compositeId = `${snap.store_slug}-${entry.productId}`;
        const categorySlug = inferCategoryFromTitle(snap.title);
        const categoryLabel = categoryMap[categorySlug];
        let images: string[] = [];
        if (snap.images) {
          try {
            const parsed = JSON.parse(snap.images);
            if (Array.isArray(parsed) && parsed.length > 0) images = parsed;
          } catch {}
        }
        if (images.length === 0 && snap.image) images = [snap.image];
        return {
          id: compositeId,
          dbId: entry.productId,
          title: snap.title,
          price: Number(snap.price),
          category: categorySlug,
          categoryLabel,
          store: snap.store_name,
          storeSlug: snap.store_slug,
          image: snap.image || "",
          images,
          size: snap.size,
          soldOut: true,
          popularityScore: 0,
          createdAt: 0,
        };
      }

      const product = entry.product!;
      const compositeId = `${product.store_slug}-${product.id}`;
      const categorySlug = inferCategoryFromTitle(product.title);
      const categoryLabel = categoryMap[categorySlug];
      const engagementScore = popularityScores[product.id] ?? 0;
      const syncedAt = product.synced_at instanceof Date
        ? product.synced_at.toISOString()
        : String(product.synced_at ?? new Date().toISOString());

      let images: string[] = [];
      if (product.images) {
        try {
          const parsed = JSON.parse(product.images);
          if (Array.isArray(parsed) && parsed.length > 0) images = parsed;
        } catch {}
      }
      if (images.length === 0 && product.image) images = [product.image];

      return {
        id: compositeId,
        dbId: product.id,
        title: product.title,
        price: Number(product.price),
        compareAtPrice: product.compare_at_price != null ? Number(product.compare_at_price) : null,
        category: categorySlug,
        categoryLabel,
        brand: null,
        brandLabel: null,
        store: product.store_name,
        storeSlug: product.store_slug,
        externalUrl: product.external_url ?? undefined,
        image: product.image || "",
        images,
        size: product.size,
        engagementScore,
        createdAt: product.id,
        popularityScore: computeProductScore({
          engagementScore,
          syncedAt,
          imageCount: images.length,
          brandSlug: null,
          price: Number(product.price),
          title: product.title,
        }),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const storeList = stores.map((s) => ({ slug: s.slug, name: s.name }));

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <Link
            href="/account"
            className="inline-block mb-6 text-xs tracking-[0.25em] uppercase text-[#5D0F17]/50 hover:text-[#5D0F17] transition"
          >
            &larr; Account
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">My Favorites</h1>
          <p className="text-sm sm:text-base text-[#5D0F17]/60 max-w-2xl">
            {favEntries.length} {favEntries.length === 1 ? "piece" : "pieces"} saved
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          {favEntries.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#5D0F17]/50 mb-6">
                You haven&apos;t favorited any products yet.
              </p>
              <Link
                href="/browse"
                className="inline-block bg-[#5D0F17] text-[#F7F3EA] px-8 py-3 text-sm uppercase tracking-wide hover:bg-[#5D0F17]/85 transition"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <FilteredProductGrid
              products={products}
              stores={storeList}
              categories={[]}
              showCategoryFilter={false}
              showBrandFilter={false}
              showSizeFilter
              from="/account/favorites"
              emptyMessage="No matching favorites found."
            />
          )}
        </div>
      </section>
    </main>
  );
}
