import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/app/lib/auth";
import { getUserFavoritedProducts, getProductFavoriteCounts, type FavoriteProductEntry } from "@/app/lib/favorites-db";
import type { DBProduct } from "@/app/lib/db";
import { getUserStoreFavoriteIds } from "@/app/lib/favorites-db";
import { getUserPurchaseHistory, getUserClickHistory } from "@/app/lib/analytics-db";
import { getUserSourcingRequests, type SourcingRequest } from "@/app/lib/sourcing-db";
import { getUserMembershipStatus } from "@/app/lib/membership-db";
import { stores } from "@/app/lib/stores";
import { categoryMap } from "@/app/lib/categoryMap";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import ProductCard from "@/app/components/ProductCard";
import AccountActions from "./AccountActions";
import InviteButton from "./InviteButton";
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

  let favProducts: DBProduct[] = [];
  let favStoreSlugs: string[] = [];
  let notificationsEnabled = true;
  let userPhone = "";
  let favCounts: Record<number, number> = {};
  let isMember = false;
  let memberSince: Date | null = null;
  let purchases: Awaited<ReturnType<typeof getUserPurchaseHistory>> = [];
  let recentClicks: Awaited<ReturnType<typeof getUserClickHistory>> = [];
  let sourcingRequests: SourcingRequest[] = [];

  if (userId) {
    try {
      const [products, storeSlugs, settings, membershipStatus, userPurchases, userClicks, userSourcing] = await Promise.all([
        getUserFavoritedProducts(userId),
        getUserStoreFavoriteIds(userId),
        getUserSettings(userId),
        getUserMembershipStatus(userId).catch(() => ({ isMember: false, memberSince: null })),
        getUserPurchaseHistory(userId).catch(() => []),
        getUserClickHistory(userId).catch(() => []),
        getUserSourcingRequests(userId).catch(() => []),
      ]);
      // Extract live (non-sold-out) products for the account page carousel
      favProducts = products.filter((e) => !e.soldOut && e.product).map((e) => e.product!);
      favStoreSlugs = storeSlugs;
      notificationsEnabled = settings.notificationsEnabled;
      userPhone = settings.phone;
      isMember = membershipStatus.isMember;
      memberSince = membershipStatus.memberSince;
      purchases = userPurchases;
      recentClicks = userClicks;
      sourcingRequests = userSourcing;
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
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      {/* ===== Compact Header ===== */}
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-[#D8CABD]/40 flex items-center justify-center shrink-0">
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-10 h-10 object-cover" />
            ) : (
              <span className="text-base font-serif text-[#5D0F17]/40">
                {(session.user.name?.[0] || session.user.email?.[0] || "?").toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{session.user.name || "My Account"}</p>
            <p className="text-xs text-[#5D0F17]/40 truncate">{session.user.email}</p>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6">
        {/* ===== VYA Insider ===== */}
        <section className="py-12 border-b border-[#5D0F17]/10">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="font-serif text-xl italic text-[#5D0F17]/80">VYA Insider</h2>
            <div className="flex-1 h-px bg-[#5D0F17]/15" />
          </div>
          {isMember ? (
            <div className="flex flex-col gap-4">
              <Link
                href="/account/insider"
                className="border border-[#5D0F17] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-[#5D0F17] hover:text-[#F7F3EA] transition group"
              >
                <div>
                  <p className="font-serif text-xl mb-1">Early Access</p>
                  <p className="text-sm text-[#5D0F17]/50 group-hover:text-[#F7F3EA]/60">
                    View new arrivals added in the last 24 hours — before anyone else.
                  </p>
                </div>
                <span className="shrink-0 text-sm uppercase tracking-[0.15em]">
                  View →
                </span>
              </Link>
                </div>
          ) : (
            <div className="border border-[#5D0F17]/15 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <p className="text-sm text-[#5D0F17]/50 leading-relaxed">
                  Get 24-hour early access to new arrivals from all VYA stores.
                </p>
              </div>
              <a
                href="/membership"
                className="shrink-0 text-center text-sm uppercase tracking-[0.15em] px-6 py-3 bg-[#5D0F17] text-[#F7F3EA] hover:bg-[#5D0F17]/85 transition"
              >
                Join VYA Insider — $10/month
              </a>
            </div>
          )}
        </section>

        {/* ===== Favorite Products ===== */}
        <section className="py-12 border-b border-[#5D0F17]/10">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-serif text-xl italic text-[#5D0F17]/80">Liked Products</h2>
            <div className="flex-1 h-px bg-[#5D0F17]/15" />
            {favProducts.length > 0 && (
              <a
                href="/account/favorites"
                className="text-sm uppercase tracking-[0.15em] hover:text-[#5D0F17]/60 transition-colors"
              >
                View All ({favProducts.length})
              </a>
            )}
          </div>
          {favProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#5D0F17]/40 text-sm mb-4">
                You haven&apos;t favorited any products yet.
              </p>
              <Link
                href="/browse"
                className="inline-block text-sm uppercase tracking-[0.15em] px-6 py-2.5 border border-[#5D0F17] hover:bg-[#5D0F17] hover:text-[#F7F3EA] transition"
              >
                Browse Products
              </Link>
            </div>
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
                        size={product.size}
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

        {/* ===== Favorite Stores ===== */}
        <section className="py-12 border-b border-[#5D0F17]/10">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-serif text-xl italic text-[#5D0F17]/80">Stores</h2>
            <div className="flex-1 h-px bg-[#5D0F17]/15" />
          </div>
          {favStores.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#5D0F17]/40 text-sm mb-4">
                You haven&apos;t favorited any stores yet.
              </p>
              <Link
                href="/stores"
                className="inline-block text-sm uppercase tracking-[0.15em] px-6 py-2.5 border border-[#5D0F17] hover:bg-[#5D0F17] hover:text-[#F7F3EA] transition"
              >
                Explore Stores
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {favStores.map((store) => store && (
                <a
                  key={store.slug}
                  href={`/stores/${store.slug}`}
                  className="block p-6 border border-[#5D0F17]/15 hover:border-[#5D0F17] transition"
                >
                  <h3 className="font-serif text-lg mb-1">{store.name}</h3>
                  <p className="text-sm text-[#5D0F17]/50">{store.location}</p>
                </a>
              ))}
            </div>
          )}
        </section>


        {/* ===== Sourcing Requests ===== */}
        <section className="py-12 border-b border-[#5D0F17]/10">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-serif text-xl italic text-[#5D0F17]/80">Sourcing Requests</h2>
            <div className="flex-1 h-px bg-[#5D0F17]/15" />
            <Link
              href="/account/sourcing"
              className="shrink-0 text-xs uppercase tracking-[0.15em] px-4 py-2 border border-[#5D0F17] hover:bg-[#5D0F17] hover:text-[#F7F3EA] transition"
            >
              + New Request
            </Link>
          </div>

          {sourcingRequests.length === 0 ? (
            <div className="border border-[#5D0F17]/15 p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <p className="font-serif text-lg mb-1">Can&apos;t find what you&apos;re looking for?</p>
                <p className="text-sm text-[#5D0F17]/50 leading-relaxed">
                  Submit a sourcing request and we&apos;ll find it from our network of stores within 21 business days.
                </p>
              </div>
              <Link
                href="/account/sourcing"
                className="shrink-0 text-center text-sm uppercase tracking-[0.15em] px-6 py-3 bg-[#5D0F17] text-[#F7F3EA] hover:bg-[#5D0F17]/85 transition"
              >
                Request Here
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sourcingRequests.map((req) => (
                  <Link
                    key={req.id}
                    href={`/account/sourcing/${req.id}`}
                    className="border border-[#5D0F17]/15 p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 hover:border-[#5D0F17] hover:bg-[#D8CABD]/10 transition"
                  >
                    <div className="flex gap-4">
                      {req.imageUrl && (
                        <img
                          src={req.imageUrl}
                          alt=""
                          className="w-14 h-14 object-cover shrink-0 border border-[#5D0F17]/10"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium leading-snug line-clamp-2">{req.description}</p>
                        <p className="text-xs text-[#5D0F17]/50 mt-1">
                          ${req.priceMin}–${req.priceMax} &middot; {req.condition}
                          {req.size ? ` · Size ${req.size}` : ""} &middot; by {req.deadline}
                        </p>
                        <p className="text-xs text-[#5D0F17]/30 mt-1">
                          {new Date(req.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 self-start text-[9px] uppercase tracking-widest px-2 py-1 ${
                        req.status === "matched"
                          ? "bg-green-100 text-green-800"
                          : req.status === "refunded"
                          ? "bg-[#D8CABD]/50 text-[#5D0F17]/50"
                          : "bg-[#5D0F17]/10 text-[#5D0F17]/70"
                      }`}
                    >
                      {req.status === "paid" ? "Searching" : req.status === "pending_payment" ? "Payment Processing" : req.status}
                    </span>
                  </Link>
                ))}
              <Link
                href="/account/sourcing"
                className="self-start text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 hover:text-[#5D0F17] transition mt-1"
              >
                + New Request
              </Link>
            </div>
          )}
        </section>

        {/* ===== Invite ===== */}
        <section className="py-12 border-b border-[#5D0F17]/10">
          <div className="border border-[#5D0F17]/15 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h2 className="font-serif text-lg mb-2">Invite a Friend</h2>
              <p className="text-sm text-[#5D0F17]/50 leading-relaxed">
                Know someone who&apos;d love VYA? Share the link and shop together.
              </p>
            </div>
            <div className="shrink-0 sm:w-48">
              <InviteButton />
            </div>
          </div>
        </section>

        {/* ===== Feedback ===== */}
        <section className="py-12 border-b border-[#5D0F17]/10">
          <div className="border border-[#5D0F17]/15 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h2 className="font-serif text-lg mb-2">Have feedback for us?</h2>
              <p className="text-sm text-[#5D0F17]/50 leading-relaxed">
                Submit your recommendations — we&apos;d love to hear from you.
              </p>
            </div>
            <div className="shrink-0 sm:w-48">
              <a
                href="https://form.typeform.com/to/ssrEgHZ1"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full border border-[#5D0F17] text-[#5D0F17] text-xs uppercase tracking-[0.15em] py-3 text-center hover:bg-[#5D0F17] hover:text-[#F7F3EA] transition-colors duration-200"
              >
                Send Feedback
              </a>
            </div>
          </div>
        </section>

        {/* ===== Settings ===== */}
        <section className="py-12 mb-8">
          <AccountActions notificationsEnabled={notificationsEnabled} initialPhone={userPhone} isMember={isMember} memberSinceLabel={memberSince ? memberSince.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null} />
        </section>
      </div>
    </main>
  );
}
