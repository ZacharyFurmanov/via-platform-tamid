export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { getUserMembershipStatus } from "@/app/lib/membership-db";
import { getInsiderProducts } from "@/app/lib/db";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { categoryMap } from "@/app/lib/categoryMap";
import MixedProductGrid from "@/app/components/MixedProductGrid";

export default async function InsiderPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/insider");
  }

  // Gate to members only
  let isMember = false;
  try {
    const status = await getUserMembershipStatus(session.user.id);
    isMember = status.isMember;
  } catch {
    // treat as non-member
  }

  if (!isMember) {
    redirect("/membership");
  }

  const products = await getInsiderProducts(48);

  const gridProducts = products.map((p) => ({
    ...p,
    categoryLabel: categoryMap[inferCategoryFromTitle(p.title)],
  }));

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <div className="flex items-center gap-4 mb-1">
            <p className="text-lg sm:text-xl font-serif italic text-[#5D0F17]/70">VIA Insider</p>
            <div className="flex-1 h-px bg-[#5D0F17]/15" />
          </div>
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-serif text-[#5D0F17]/10 leading-none -mt-2 mb-4">
            Early Access
          </h1>
          <p className="text-sm sm:text-base text-[#5D0F17]/60 max-w-2xl">
            Pieces added in the last 24 hours — yours before anyone else sees them.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          {gridProducts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[#5D0F17]/50 text-sm mb-2">
                No new arrivals in the last 24 hours.
              </p>
              <p className="text-[#5D0F17]/40 text-sm">
                Check back soon — new pieces drop regularly.
              </p>
            </div>
          ) : (
            <MixedProductGrid products={gridProducts} from="/account/insider" />
          )}
        </div>
      </section>
    </main>
  );
}
