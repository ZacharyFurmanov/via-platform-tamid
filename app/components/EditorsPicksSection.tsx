import { getAllEditorsPicks } from "@/app/lib/editors-picks-db";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { categoryMap } from "@/app/lib/categoryMap";
import Link from "next/link";
import EditorsPicksScroller from "./EditorsPicksScroller";

export default async function EditorsPicksSection() {
  const picks = await getAllEditorsPicks();

  if (picks.length === 0) return null;

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

  return (
    <section className="bg-[#F7F3EA] pt-16 pb-20 sm:pt-24 sm:pb-28 border-t border-[#5D0F17]/10">
      <div className="max-w-7xl mx-auto">
        <div className="px-6 mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-1 font-sans">Curated</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#5D0F17]">Editor&apos;s Picks</h2>
            </div>
            <Link
              href="/editors-picks"
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
}
