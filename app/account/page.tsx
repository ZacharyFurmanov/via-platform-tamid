import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { getUserFavoritedProducts, getProductFavoriteCounts } from "@/app/lib/favorites-db";
import { getUserStoreFavoriteIds } from "@/app/lib/favorites-db";
import { getUserMembershipStatus } from "@/app/lib/membership-db";
import { stores } from "@/app/lib/stores";
import { categoryMap } from "@/app/lib/categoryMap";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import ProductCard from "@/app/components/ProductCard";
import AccountActions from "./AccountActions";
import MembershipPortalButton from "./MembershipPortalButton";
import { neon } from "@neondatabase/serverless";

async function getUserSettings(userId: string): Promise<{ notificationsEnabled: boolean; phone: string }> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return { notificationsEnabled: true, phone: "" };
  const sql = neon(url);
  const rows = await sql`SELECT notification_emails_enabled, phone FROM users WHERE id = ${userId}`;
  return {
    notificationsEnabled: rows[0]?.notification_emails_enabled !== false,
    phone: (rows[0]?.phone as string) || "",
  };
}

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;

  let favProducts: Awaited<ReturnType<typeof getUserFavoritedProducts>> = [];
  let favStoreSlugs: string[] = [];
  let notificationsEnabled = true;
  let userPhone = "";
  let favCounts: Record<number, number> = {};
  let isMember = false;
  let memberSince: Date | null = null;

  if (userId) {
    try {
      const [products, storeSlugs, settings, membershipStatus] = await Promise.all([
        getUserFavoritedProducts(userId),
        getUserStoreFavoriteIds(userId),
        getUserSettings(userId),
        getUserMembershipStatus(userId).catch(() => ({ isMember: false, memberSince: null })),
      ]);
      favProducts = products;
      favStoreSlugs = storeSlugs;
      notificationsEnabled = settings.notificationsEnabled;
      userPhone = settings.phone;
      isMember = membershipStatus.isMember;
      memberSince = membershipStatus.memberSince;
      if (favProducts.length > 0) {
        favCounts = await getProductFavoriteCounts(favProducts.map((p) => p.id));
      }
    } catch (err) {
      console.error("Failed to load account data:", err);
    }
  }

  const favStores = favStoreSlugs
    .map((slug) => stores.find((s) => s.slug === slug))
    .filter(Boolean);

  return (
    <main className="bg-white min-h-screen">
      {/* Profile Header */}
      <section className="border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
              <span className="text-2xl font-serif text-black/40">
                {(session.user.name?.[0] || session.user.email?.[0] || "?").toUpperCase()}
              </span>
            </div>
            <div>
              {session.user.name && (
                <h1 className="text-2xl sm:text-3xl font-serif">{session.user.name}</h1>
              )}
              <p className="text-sm text-black/50">{session.user.email}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6">
        {/* VIA Insider Membership */}
        <section className="py-12 border-b border-neutral-100">
          <h2 className="font-serif text-2xl mb-6">VIA Insider Membership</h2>
          {isMember ? (
            <div className="flex flex-col gap-4">
              <a
                href="/account/insider"
                className="border border-black p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-black hover:text-white transition group"
              >
                <div>
                  <p className="font-serif text-xl mb-1">VIA Insider</p>
                  <p className="text-sm text-black/50 group-hover:text-white/60">
                    View new arrivals added in the last 24 hours — before anyone else.
                  </p>
                </div>
                <span className="shrink-0 text-sm uppercase tracking-wide">
                  View →
                </span>
              </a>
              <div className="border border-neutral-200 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                  <p className="font-medium text-sm mb-1">Active</p>
                  {memberSince && (
                    <p className="text-sm text-black/50">
                      Member since{" "}
                      {memberSince.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <MembershipPortalButton />
              </div>
            </div>
          ) : (
            <div className="border border-neutral-200 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <p className="text-sm text-black/50 leading-relaxed">
                  Get 24-hour early access to new arrivals from all VIA stores.
                </p>
              </div>
              <a
                href="/membership"
                className="shrink-0 text-center text-sm uppercase tracking-wide px-6 py-3 bg-black text-white hover:bg-black/85 transition"
              >
                Join VIA Insider — $10/month
              </a>
            </div>
          )}
        </section>

        {/* Refer a Friend + Friends — side by side on desktop */}
        <section className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Refer a Friend */}
            <div className="border border-neutral-200 p-6 sm:p-8 flex flex-col">
              <h2 className="font-serif text-xl mb-2">Refer a Friend</h2>
              <p className="text-sm text-black/50 mb-6 leading-relaxed">
                Share VIA with friends and help us grow the community of independent vintage and secondhand lovers.
              </p>
              <div className="mt-auto flex flex-col gap-3">
                <a
                  href="/waitlist"
                  className="block text-center text-sm uppercase tracking-wide px-5 py-3 bg-black text-white hover:bg-black/85 transition"
                >
                  Get Your Referral Link
                </a>
                <p className="text-xs text-black/40 text-center">
                  Invite 2 friends to enter the $1,000 giveaway
                </p>
              </div>
            </div>

            {/* Invite a Friend */}
            <div className="border border-neutral-200 p-6 sm:p-8 flex flex-col">
              <h2 className="font-serif text-xl mb-2">Invite a Friend</h2>
              <p className="text-sm text-black/50 mb-6 leading-relaxed">
                Know someone who&apos;d love VIA? Send them an invite and shop together.
              </p>
              <div className="mt-auto">
                <a
                  href="/account/friends"
                  className="block text-center text-sm uppercase tracking-wide px-5 py-3 border border-black hover:bg-black hover:text-white transition"
                >
                  Invite Friend
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Favorited Products — horizontal scroll preview */}
        <section className="py-12 border-t border-neutral-100">
          <div className="flex items-end justify-between mb-8">
            <h2 className="font-serif text-2xl">Favorite Products</h2>
            {favProducts.length > 0 && (
              <a
                href="/account/favorites"
                className="text-sm uppercase tracking-wide link-underline"
              >
                View all ({favProducts.length})
              </a>
            )}
          </div>
          {favProducts.length === 0 ? (
            <p className="text-black/50 text-sm">
              You haven&apos;t favorited any products yet. Browse and tap the heart to save pieces you love.
            </p>
          ) : (
            <div className="overflow-x-auto scrollbar-hide -mx-6 px-6">
              <div className="flex gap-4" style={{ width: "max-content" }}>
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
                    <div key={product.id} className="w-[160px] sm:w-[200px] flex-shrink-0">
                      <ProductCard
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
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Favorited Stores */}
        <section className="py-12 border-t border-neutral-100">
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
        <section className="py-12 border-t border-neutral-100 mb-8">
          <AccountActions notificationsEnabled={notificationsEnabled} initialPhone={userPhone} />
        </section>
      </div>
    </main>
  );
}
