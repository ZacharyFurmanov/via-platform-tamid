import { notFound } from "next/navigation";
import { stores } from "../storeData";
import { products } from "../productData";
import ProductCard from "@/app/components/ProductCard";

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const store = stores.find((s) => s.slug === slug);
  if (!store) return notFound();

  const storeProducts = products.filter(
    (p) => p.storeSlug === store.slug
  );

  return (
    <main className="bg-white min-h-screen">
      {/* HERO */}
      <section className="bg-[#f7f6f3] py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-6xl font-serif mb-4">{store.name}</h1>
          <p className="text-gray-600 mb-6">{store.location}</p>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            {store.description}
          </p>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-serif mb-12">
            Available from {store.name}
          </h2>

          {storeProducts.length === 0 ? (
            <p className="text-gray-500">Products coming soon.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
              {storeProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  name={product.name}
                  price={product.price}
                  category={product.category}
                  storeName={store.name}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

