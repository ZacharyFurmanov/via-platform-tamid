export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getAllEditorsPicks, COLLECTIONS } from "@/app/lib/editors-picks-db";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { categoryMap } from "@/app/lib/categoryMap";
import MixedProductGrid from "@/app/components/MixedProductGrid";

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = COLLECTIONS.find((c) => c.slug === slug);
  if (!collection) notFound();

  const picks = await getAllEditorsPicks(slug);

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
          <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-2 font-sans">
            {collection.curatedBy ? `Curated by ${collection.curatedBy}` : "Curated"}
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">{collection.name}</h1>
          <p className="text-sm sm:text-base text-[#5D0F17]/60 max-w-2xl">
            Hand-selected from all of our stores.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          {gridProducts.length === 0 ? (
            <p className="text-[#5D0F17]/50 text-sm">No picks yet — check back soon.</p>
          ) : (
            <MixedProductGrid products={gridProducts} from={`/collections/${slug}`} />
          )}
        </div>
      </section>
    </main>
  );
}
