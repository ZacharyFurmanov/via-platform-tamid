import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/app/lib/auth";
import { getUserFavoritedProducts, getProductFavoriteCounts } from "@/app/lib/favorites-db";
import { categoryMap } from "@/app/lib/categoryMap";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import ProductCard from "@/app/components/ProductCard";

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;

  let favProducts: Awaited<ReturnType<typeof getUserFavoritedProducts>> = [];
  let favCounts: Record<number, number> = {};

  if (userId) {
    try {
      favProducts = await getUserFavoritedProducts(userId);
      if (favProducts.length > 0) {
        favCounts = await getProductFavoriteCounts(favProducts.map((p) => p.id));
      }
    } catch (err) {
      console.error("Failed to load favorites:", err);
    }
  }

  return (
    <main className="bg-white min-h-screen">
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <Link
            href="/account"
            className="inline-block mb-6 text-xs tracking-[0.25em] uppercase text-neutral-500 hover:text-black transition"
          >
            &larr; Account
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">
            Favorite Products
          </h1>
          <p className="text-sm text-neutral-500">
            {favProducts.length} {favProducts.length === 1 ? "piece" : "pieces"} saved
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-6">
          {favProducts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-black/50 mb-6">
                You haven&apos;t favorited any products yet.
              </p>
              <Link
                href="/browse"
                className="inline-block bg-black text-white px-8 py-3 text-sm uppercase tracking-wide hover:bg-neutral-800 transition"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
              {favProducts.map((product) => {
                const compositeId = `${product.store_slug}-${product.id}`;
                const categorySlug = inferCategoryFromTitle(product.title);
                const categoryLabel = categoryMap[categorySlug];

                let images: string[] = [];
                if (product.images) {
                  try {
                    const parsed = JSON.parse(product.images);
                    if (Array.isArray(parsed) && parsed.length > 0) images = parsed;
                  } catch {}
                }
                if (images.length === 0 && product.image) {
                  images = [product.image];
                }

                return (
                  <ProductCard
                    key={product.id}
                    id={compositeId}
                    dbId={product.id}
                    name={product.title}
                    price={`$${Math.round(Number(product.price))}`}
                    category={categoryLabel}
                    storeName={product.store_name}
                    storeSlug={product.store_slug}
                    image={product.image || ""}
                    images={images}
                    favoriteCount={favCounts[product.id]}
                    from="/account/favorites"
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
