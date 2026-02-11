import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { getUserFavoritedProducts } from "@/app/lib/favorites-db";
import { getUserStoreFavoriteIds } from "@/app/lib/favorites-db";
import { stores } from "@/app/lib/stores";
import { categoryMap } from "@/app/lib/categoryMap";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import ProductCard from "@/app/components/ProductCard";
import AccountActions from "./AccountActions";
import { neon } from "@neondatabase/serverless";

async function getNotificationPreference(userId: string): Promise<boolean> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return true;
  const sql = neon(url);
  const rows = await sql`SELECT notification_emails_enabled FROM users WHERE id = ${userId}`;
  return rows[0]?.notification_emails_enabled !== false;
}

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [favProducts, favStoreSlugs, notificationsEnabled] = await Promise.all([
    getUserFavoritedProducts(session.user.id!),
    getUserStoreFavoriteIds(session.user.id!),
    getNotificationPreference(session.user.id!),
  ]);

  const favStores = favStoreSlugs
    .map((slug) => stores.find((s) => s.slug === slug))
    .filter(Boolean);

  return (
    <main className="bg-white min-h-screen">
      {/* Profile Header */}
      <section className="border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
          <div className="flex items-center gap-5">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt=""
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
                <span className="text-2xl font-serif text-black/40">
                  {(session.user.name?.[0] || session.user.email?.[0] || "?").toUpperCase()}
                </span>
              </div>
            )}
            <div>
              {session.user.name && (
                <h1 className="text-2xl sm:text-3xl font-serif">{session.user.name}</h1>
              )}
              <p className="text-sm text-black/50">{session.user.email}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Favorited Products */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="font-serif text-2xl mb-8">Favorite Products</h2>
        {favProducts.length === 0 ? (
          <p className="text-black/50 text-sm">
            You haven&apos;t favorited any products yet. Browse and tap the heart to save pieces you love.
          </p>
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
                  price={`$${Number(product.price)}`}
                  category={categoryLabel}
                  storeName={product.store_name}
                  storeSlug={product.store_slug}
                  image={product.image || ""}
                  images={images}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Favorited Stores */}
      <section className="max-w-5xl mx-auto px-6 py-12 border-t border-neutral-100">
        <h2 className="font-serif text-2xl mb-8">Favorite Stores</h2>
        {favStores.length === 0 ? (
          <p className="text-black/50 text-sm">
            You haven&apos;t favorited any stores yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {favStores.map((store) => store && (
              <a
                key={store.slug}
                href={`/stores/${store.slug}`}
                className="block p-6 border border-neutral-200 hover:border-black transition"
              >
                <h3 className="font-serif text-lg mb-1">{store.name}</h3>
                <p className="text-sm text-black/50">{store.location}</p>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Settings & Sign Out */}
      <section className="max-w-5xl mx-auto px-6 py-12 border-t border-neutral-100">
        <AccountActions notificationsEnabled={notificationsEnabled} />
      </section>
    </main>
  );
}
