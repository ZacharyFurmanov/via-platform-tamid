export const dynamic = "force-dynamic";

import { getAllCollectionPicks, COLLECTIONS } from "@/app/lib/editors-picks-db";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { categoryMap } from "@/app/lib/categoryMap";
import Link from "next/link";
import EditorsPicksScroller from "@/app/components/EditorsPicksScroller";

export default async function CollectionsPage() {
  const allPicks = await getAllCollectionPicks();
  const visibleCollections = COLLECTIONS.filter((col) => (allPicks[col.slug]?.length ?? 0) > 0);

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-2 font-sans">Curated</p>
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">Collections</h1>
          <p className="text-sm sm:text-base text-[#5D0F17]/60 max-w-2xl">
            Hand-selected pieces from our editors and partners.
          </p>
        </div>
      </section>

      {visibleCollections.length === 0 ? (
        <div className="max-w-7xl mx-auto px-6 py-24">
          <p className="text-[#5D0F17]/50 text-sm">No collections yet — check back soon.</p>
        </div>
      ) : (
        <>
          {visibleCollections.map((col) => {
            const picks = allPicks[col.slug] ?? [];
            const scrollerPicks = picks.map((pick) => ({
              pickId: pick.pickId,
              product: {
                id: pick.product.id,
                title: pick.product.title,
                price: pick.product.price,
                image: pick.product.image ?? "",
                images: pick.product.images ?? "",
                storeSlug: pick.product.storeSlug,
                storeName: pick.product.storeName,
                size: pick.product.size,
                categoryLabel: categoryMap[inferCategoryFromTitle(pick.product.title)],
                compositeId: `${pick.product.storeSlug}-${pick.product.id}`,
              },
            }));

            const viewAllHref = col.slug === "editors-picks" ? "/editors-picks" : `/collections/${col.slug}`;

            return (
              <section key={col.slug} className="pt-16 pb-20 sm:pt-24 sm:pb-28 border-t border-[#5D0F17]/10">
                <div className="max-w-7xl mx-auto">
                  <div className="px-6 mb-8 sm:mb-12">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-1 font-sans">
                          {col.curatedBy ? `Curated by ${col.curatedBy}` : "Curated"}
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-serif text-[#5D0F17]">{col.name}</h2>
                      </div>
                      <Link
                        href={viewAllHref}
                        className="text-sm uppercase tracking-[0.15em] text-[#5D0F17] hover:text-[#5D0F17]/60 transition-colors min-h-[44px] flex items-center font-sans"
                      >
                        View All Picks
                      </Link>
                    </div>
                  </div>
                  <EditorsPicksScroller picks={scrollerPicks} />
                </div>
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
