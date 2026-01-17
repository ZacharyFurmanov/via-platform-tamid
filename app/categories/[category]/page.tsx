import { notFound } from "next/navigation";
import { products } from "../../stores/productData";
import { stores } from "../../stores/storeData";
import ProductCard from "../../components/ProductCard";

const CATEGORY_LABELS: Record<string, string> = {
  clothes: "Clothes",
  bags: "Bags",
  shoes: "Shoes",
  accessories: "Accessories",
};

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const label = CATEGORY_LABELS[category];

  if (!label) return notFound();

  const filteredProducts = products.filter(
    (p) => p.category === label
  );

  return (
    <main className="bg-white min-h-screen text-black">
      {/* HEADER */}
      <section className="bg-neutral-100 py-32">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-6xl font-serif mb-6 text-black">
            {label}
          </h1>
          <p className="text-lg text-black/80">
            Curated {label.toLowerCase()} from independent resale stores.
          </p>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          {filteredProducts.length === 0 ? (
            <p className="text-black/70 text-center">
              Products coming soon.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
              {filteredProducts.map((product) => {
                const store = stores.find(
                  (s) => s.slug === product.storeSlug
                );

                return (
                  <ProductCard
                    key={product.id}
                    name={product.name}
                    price={product.price}
                    category={product.category}
                    storeName={store?.name ?? ""}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

