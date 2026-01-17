import Link from "next/link";
import { stores } from "./storeData";

export default function StoresPage() {
  return (
    <main className="bg-white min-h-screen text-black">
      {/* HEADER */}
      {/* HEADER */}
<section className="bg-[#f7f6f3] py-32">
  <div className="max-w-5xl mx-auto px-6 text-center">
    <h1 className="text-6xl font-serif mb-6 text-black">
      Explore Our Stores
    </h1>
    <p className="text-lg text-neutral-700 max-w-2xl mx-auto">
      Discover independent vintage and resale stores from across the country —
      each curated with a distinct point of view.
    </p>
  </div>
</section>

      {/* STORES GRID */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
            {stores.map((store) => (
              <Link
                key={store.slug}
                href={`/stores/${store.slug}`}
                className="group bg-neutral-100 p-16 transition-all hover:bg-black"
              >
                {/* Image placeholder */}
                <div className="aspect-[4/5] bg-gray-200 mb-6" />

                <h2 className="text-2xl font-serif mb-1">
                  {store.name}
                </h2>

                <p className="text-sm text-gray-600 group-hover:text-gray-300 mb-3">
                  {store.location}
                </p>

                <p className="text-gray-800 group-hover:text-gray-300 leading-relaxed">
                  {store.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
