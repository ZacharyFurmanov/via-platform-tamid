import Link from "next/link";
import Image from "next/image";
import { stores } from "@/app/lib/stores";

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
                <Link href={`/stores/${store.slug}`} className="block mb-3 sm:mb-6">
                  <div className="relative aspect-[3/4] bg-[#D8CABD]/30 overflow-hidden">
                    {store.image && (
                      <Image
                        src={store.image}
                        alt={store.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className={`${store.imageFit === "contain" ? "object-contain p-2 sm:p-4" : "object-cover"} transition-transform duration-700 ease-out group-hover:scale-[1.03]`}
                      />
                    )}
                  </div>
                </Link>

                {/* TEXT (ALSO CLICKABLE) */}
                <Link href={`/stores/${store.slug}`} className="block">
                  <h2 className="text-sm sm:text-lg font-serif mb-1 link-underline">
                    {store.name}
                  </h2>
                </Link>

                <p className="text-xs sm:text-sm text-[#5D0F17]/50 mb-2 sm:mb-4">
                  {store.location}
                </p>

                <p className="hidden sm:block text-sm text-[#5D0F17]/70 leading-relaxed line-clamp-3">
                  {store.description}
                </p>

              </div>
            ))}

          </div>
        </div>
      </section>

    </main>
  );
}
