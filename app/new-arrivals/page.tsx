export const dynamic = "force-dynamic";

import { auth } from "@/app/lib/auth";
import { getNewArrivals } from "@/app/lib/db";
import { getUserMembershipStatus } from "@/app/lib/membership-db";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { categoryMap } from "@/app/lib/categoryMap";
import MixedProductGrid from "@/app/components/MixedProductGrid";

export default async function NewArrivalsPage() {
  const session = await auth();

  let isMember = false;
  if (session?.user?.id) {
    try {
      const status = await getUserMembershipStatus(session.user.id);
      isMember = status.isMember;
    } catch {
      // DB columns may not exist yet; treat as non-member
    }
  }

  const products = await getNewArrivals(48, 14, isMember);

  const gridProducts = products.map((p) => ({
    ...p,
    categoryLabel: categoryMap[inferCategoryFromTitle(p.title)],
  }));

  return (
    <main className="bg-white min-h-screen text-black">
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">
            New Arrivals
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 max-w-2xl">
            The latest pieces added by our stores in the past two weeks.
          </p>
        </div>
      </section>

      {!isMember && (
        <div className="border-b border-neutral-100 bg-neutral-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-black/60">
              Members see new arrivals 24 hours early.
            </p>
            <a
              href="/membership"
              className="text-sm font-medium underline underline-offset-2 hover:text-black/70 transition whitespace-nowrap"
            >
              Join VIA Insider — $10/month →
            </a>
          </div>
        </div>
      )}

      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          {products.length === 0 ? (
            <p className="text-neutral-500 text-sm">
              No new arrivals right now. Check back soon.
            </p>
          ) : (
            <MixedProductGrid products={gridProducts} from="/new-arrivals" />
          )}
        </div>
      </section>
    </main>
  );
}
