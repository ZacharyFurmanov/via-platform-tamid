import Link from "next/link";
import Image from "next/image";
import { stores } from "@/app/lib/stores";

export default function StoresPage() {
  return (
    <main className="bg-white min-h-screen text-black">

      {/* ================= HEADER ================= */}
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">
            Explore Our Stores
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 max-w-2xl">
            A curated selection of independent vintage and resale stores,
            each with a distinct point of view.
          </p>
        </div>
      </section>

      {/* ================= STORES GRID ================= */}
      <section className="py-20 sm:py-36">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 lg:gap-x-12 gap-y-8 sm:gap-y-24">

            {stores.map((store) => (
              <div key={store.slug} className="group">

                {/* IMAGE (CLICKABLE) */}
                <Link href={`/stores/${store.slug}`} className="block mb-6">
                  <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                    {store.image && (
                      <Image
                        src={store.image}
                        alt={store.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                </Link>

                {/* TEXT (ALSO CLICKABLE) */}
                <Link href={`/stores/${store.slug}`} className="block">
                  <h2 className="text-lg font-serif mb-1 link-underline">
                    {store.name}
                  </h2>
                </Link>

                <p className="text-sm text-neutral-500 mb-4">
                  {store.location}
                </p>

                <p className="text-sm text-neutral-700 leading-relaxed line-clamp-3">
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
