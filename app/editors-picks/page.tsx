export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getEveryonesFavorites } from "@/app/lib/editors-picks-db";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { categoryMap } from "@/app/lib/categoryMap";
import MixedProductGrid from "@/app/components/MixedProductGrid";

export const metadata: Metadata = {
 title: "Everyone's Favorites — VYA",
 description: "The most-loved vintage and secondhand pieces from our community of tastemakers.",
 openGraph: {
 title: "Everyone's Favorites — VYA",
 description: "The most-loved vintage and secondhand pieces from our community of tastemakers.",
 images: [{ url: "/og-image.png", width: 1200, height: 630 }],
 },
 twitter: {
 card: "summary_large_image",
 title: "Everyone's Favorites — VYA",
 description: "The most-loved vintage and secondhand pieces from our community of tastemakers.",
 images: ["/og-image.png"],
 },
};

export default async function EditorsPicksPage() {
 const picks = await getEveryonesFavorites(400);

 const gridProducts = picks.map((pick) => ({
 id: pick.product.id,
 store_slug: pick.product.storeSlug,
 store_name: pick.product.storeName,
 title: pick.product.title,
 price: pick.product.price,
 currency: pick.product.currency,
 image: pick.product.image,
 images: pick.product.images,
 size: pick.product.size,
 categoryLabel: categoryMap[inferCategoryFromTitle(pick.product.title)],
 favoriteCount: pick.favoriteCount,
 }));

 return (
 <main className="bg-[#FFFDF8] min-h-screen text-[#5D0F17]">
 <section className="">
 <div className="max-w-7xl mx-auto px-6 pt-8 pb-4 sm:pt-10 sm:pb-6">
 <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-2 font-sans">Curated by the community</p>
 <h1 className="text-2xl sm:text-3xl font-serif mb-2">Everyone&apos;s Favorites</h1>
 <p className="text-sm sm:text-base text-[#5D0F17]/60 max-w-2xl">
 The most-loved pieces from our community of tastemakers — ranked by the people with the best taste.
 </p>
 </div>
 </section>

 <section className="py-6 sm:py-8">
 <div className="max-w-7xl mx-auto px-6">
 {gridProducts.length === 0 ? (
 <p className="text-[#5D0F17]/50 text-sm">
 No favorites yet — start hearting pieces to see them here.
 </p>
 ) : (
 <MixedProductGrid products={gridProducts} from="/editors-picks" allEditorsPicks />
 )}
 </div>
 </section>
 </main>
 );
}
