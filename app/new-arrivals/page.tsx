export const dynamic = "force-dynamic";

import { getNewArrivals } from "@/app/lib/db";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { categoryMap } from "@/app/lib/categoryMap";
import { deriveSize } from "@/app/lib/inventory";
import MixedProductGrid from "@/app/components/MixedProductGrid";
import { auth } from "@/app/lib/auth";
import { getUserMembershipStatus } from "@/app/lib/membership-db";

export default async function NewArrivalsPage() {
  const session = await auth();
  const isMember = session?.user?.id
    ? await getUserMembershipStatus(session.user.id).then((s) => s.isMember).catch(() => false)
    : false;

  const products = await getNewArrivals(500, 7, isMember);

  const gridProducts = products.map((p) => ({
    ...p,
    categoryLabel: categoryMap[inferCategoryFromTitle(p.title)],
    size: deriveSize(p),
  }));

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">New Arrivals</h1>
          <p className="text-sm sm:text-base text-[#5D0F17]/60 max-w-2xl">
            The latest pieces added by our stores this week.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          {products.length === 0 ? (
            <p className="text-[#5D0F17]/50 text-sm">
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
