export const dynamic = "force-dynamic";

import { getAllEditorsPicks } from "@/app/lib/editors-picks-db";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { categoryMap } from "@/app/lib/categoryMap";
import MixedProductGrid from "@/app/components/MixedProductGrid";

export default async function EditorsPicksPage() {
  const picks = await getAllEditorsPicks();

  const gridProducts = picks.map((pick) => ({
    id: pick.product.id,
    store_slug: pick.product.storeSlug,
    store_name: pick.product.storeName,
    title: pick.product.title,
    price: pick.product.price,
    image: pick.product.image,
    images: pick.product.images,
    size: pick.product.size,
    categoryLabel: categoryMap[inferCategoryFromTitle(pick.product.title)],
  }));

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">Editor&apos;s Picks</h1>
          <p className="text-sm sm:text-base text-[#5D0F17]/60 max-w-2xl">
            Hand-selected from all of our stores.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          {gridProducts.length === 0 ? (
            <p className="text-[#5D0F17]/50 text-sm">
              No picks this week yet — check back Sunday.
            </p>
          ) : (
            <MixedProductGrid products={gridProducts} from="/editors-picks" allEditorsPicks />
          )}
        </div>
      </section>
    </main>
  );
}
