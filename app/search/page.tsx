"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";

type SearchProduct = {
  id: number;
  name: string;
  storeSlug: string;
  storeName: string;
  price: string;
  image?: string;
};

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q.trim()) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
      .then((res) => res.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <main className="bg-white min-h-screen text-black">
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-16">
          <h1 className="text-2xl sm:text-3xl font-serif mb-1">
            {q ? `Results for "${q}"` : "Search"}
          </h1>
          {!loading && (
            <p className="text-sm text-neutral-500">
              {products.length} {products.length === 1 ? "item" : "items"} found
            </p>
          )}
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-6">
          {loading && (
            <p className="text-sm text-neutral-400">Searching...</p>
          )}

          {!loading && products.length === 0 && q && (
            <div className="text-center py-16">
              <p className="text-neutral-500 mb-6">
                No items found for &ldquo;{q}&rdquo;
              </p>
              <Link
                href="/stores"
                className="inline-block bg-black text-white px-8 py-3 text-sm uppercase tracking-wide hover:bg-neutral-800 transition"
              >
                Browse Stores
              </Link>
            </div>
          )}

          {products.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-12">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.storeSlug}-${p.id}`}
                  className="group block"
                >
                  <div className="aspect-[3/4] bg-neutral-100 overflow-hidden mb-3">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide text-black/60 mb-1">
                    {p.storeName}
                  </p>
                  <h3 className="font-serif text-base sm:text-lg text-black leading-snug line-clamp-2">
                    {p.name}
                  </h3>
                  <p className="text-sm sm:text-base mt-1 text-black font-medium">
                    {p.price}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="bg-white min-h-screen text-black">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <p className="text-sm text-neutral-400">Loading...</p>
          </div>
        </main>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
