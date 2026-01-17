import Link from "next/link";

const categories = [
  { slug: "clothes", label: "Clothing" },
  { slug: "bags", label: "Bags" },
  { slug: "shoes", label: "Shoes" },
  { slug: "accessories", label: "Accessories" },
];

export default function CategoriesPage() {
  return (
    <main className="bg-white min-h-screen">

      {/* HEADER */}
      <section className="py-32">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-6xl font-serif mb-6">Shop by Category</h1>
          <p className="text-neutral-600 text-lg">
            Browse curated resale across our most-loved categories.
          </p>
        </div>
      </section>

      {/* GRID */}
      <section className="pb-32">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">

          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="group"
            >
              {/* Image placeholder */}
              <div className="aspect-[3/4] bg-neutral-200 mb-4 overflow-hidden">
                <div className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
              </div>

              <h2 className="text-lg font-serif tracking-wide">
                {cat.label}
              </h2>
            </Link>
          ))}

        </div>
      </section>
    </main>
  );
}
