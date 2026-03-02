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
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <Link
            href="/account"
            className="inline-block mb-6 text-xs tracking-[0.25em] uppercase text-[#5D0F17]/50 hover:text-[#5D0F17] transition"
          >
            &larr; Account
          </Link>
          <div className="flex items-center gap-4 mb-1">
            <p className="text-lg sm:text-xl font-serif italic text-[#5D0F17]/70">My</p>
            <div className="flex-1 h-px bg-[#5D0F17]/15" />
          </div>
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-serif text-[#5D0F17]/10 leading-none -mt-2 mb-4">
            Favorites
          </h1>
          <p className="text-sm text-[#5D0F17]/50">
            {favProducts.length} {favProducts.length === 1 ? "piece" : "pieces"} saved
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-6">
          {favProducts.length === 0 ? (
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
                    size={product.size}
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
