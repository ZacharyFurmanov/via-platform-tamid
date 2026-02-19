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

type SearchDesigner = { slug: string; label: string };
type SearchCategory = { slug: string; label: string };
type SearchStore = { slug: string; name: string; location: string };

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [designers, setDesigners] = useState<SearchDesigner[]>([]);
  const [categories, setCategories] = useState<SearchCategory[]>([]);
  const [matchedStores, setMatchedStores] = useState<SearchStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q.trim()) {
      setProducts([]);
      setDesigners([]);
      setCategories([]);
      setMatchedStores([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
        setDesigners(data.designers || []);
        setCategories(data.categories || []);
        setMatchedStores(data.stores || []);
      })
      .catch(() => {
        setProducts([]);
        setDesigners([]);
        setCategories([]);
        setMatchedStores([]);
      })
      .finally(() => setLoading(false));
  }, [q]);

  const hasQuickLinks = designers.length > 0 || categories.length > 0 || matchedStores.length > 0;

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

          {/* Quick links: Designers, Categories, Stores */}
          {!loading && hasQuickLinks && (
            <div className="flex flex-wrap gap-x-12 gap-y-6 mb-12 pb-10 border-b border-neutral-200">
              {designers.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-neutral-400 mb-3">Designers</p>
                  <div className="flex flex-wrap gap-2">
                    {designers.map((d) => (
                      <Link
                        key={d.slug}
                        href={`/brands/${d.slug}`}
                        className="inline-block border border-neutral-200 px-4 py-2 text-sm hover:bg-black hover:text-white hover:border-black transition-colors"
                      >
                        {d.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {categories.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-neutral-400 mb-3">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/categories/${c.slug}`}
                        className="inline-block border border-neutral-200 px-4 py-2 text-sm hover:bg-black hover:text-white hover:border-black transition-colors"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {matchedStores.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-neutral-400 mb-3">Stores</p>
                  <div className="flex flex-wrap gap-2">
                    {matchedStores.map((s) => (
                      <Link
                        key={s.slug}
                        href={`/stores/${s.slug}`}
                        className="inline-block border border-neutral-200 px-4 py-2 text-sm hover:bg-black hover:text-white hover:border-black transition-colors"
                      >
                        {s.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
            <>
              <p className="text-[10px] uppercase tracking-[0.15em] text-neutral-400 mb-6">Products</p>
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
                    <p className="text-[11px] sm:text-xs uppercase tracking-wide text-black/50 mb-1">
                      {p.storeName}
                    </p>
                    <h3 className="font-serif text-sm sm:text-base text-black leading-snug line-clamp-2">
                      {p.name}
                    </h3>
                    <p className="text-sm mt-1 text-black/80">
                      {p.price}
                    </p>
                  </Link>
                ))}
              </div>
            </>
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
