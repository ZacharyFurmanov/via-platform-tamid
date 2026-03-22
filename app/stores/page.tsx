import Image from "next/image";
import { stores } from "@/app/lib/stores";
import TrackedStoreLink from "@/app/components/TrackedStoreLink";

export const revalidate = 3600; // Re-render at most once per hour

export default function StoresPage() {
  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">

      {/* ================= HEADER ================= */}
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">All Stores</h1>
          <p className="text-sm sm:text-base text-[#5D0F17]/60 max-w-2xl">
            A selection of independent vintage and secondhand stores,
            each with a distinct point of view.
          </p>
        </div>
      </section>

      {/* ================= STORES GRID ================= */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 lg:gap-x-12 gap-y-8 sm:gap-y-24">

            {stores.map((store) => (
              <div key={store.slug} className="group">

                {/* IMAGE (CLICKABLE) */}
                <TrackedStoreLink
                  href={`/stores/${store.slug}`}
                  storeSlug={store.slug}
                  storeName={store.name}
                  surface="stores_index"
                  className="block mb-3 sm:mb-6"
                >
                  <div className="relative aspect-[3/4] overflow-hidden" style={{ backgroundColor: store.image?.includes("placeholder") ? "#FFFDF8" : undefined }}>
                    {store.image && !store.image.includes("placeholder") ? (
                      <Image
                        src={store.image}
                        alt={store.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ backgroundColor: "#FFFDF8" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/vya-logo.png"
                          alt="VYA"
                          className="w-20 sm:w-28 blur-[1px] opacity-40 select-none pointer-events-none"
                        />
                        <p className="text-[8px] sm:text-[9px] uppercase tracking-[0.3em] text-[#5D0F17]/40">
                          Coming Soon
                        </p>
                      </div>
                    )}
                  </div>
                </TrackedStoreLink>

                {/* TEXT (ALSO CLICKABLE) */}
                <TrackedStoreLink
                  href={`/stores/${store.slug}`}
                  storeSlug={store.slug}
                  storeName={store.name}
                  surface="stores_index"
                  className="block"
                >
                  <h2 className="text-sm sm:text-lg font-serif mb-1 link-underline">
                    {store.name}
                  </h2>
                </TrackedStoreLink>

                <p className="text-xs sm:text-sm text-[#5D0F17]/50 mb-2 sm:mb-4">
                  {store.location}
                </p>


              </div>
            ))}

          </div>
        </div>
      </section>

    </main>
  );
}
