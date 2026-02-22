"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
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

type SortOption = "relevance" | "price-asc" | "price-desc";

function parsePrice(price: string): number {
  return Number(price.replace(/[^0-9.]/g, "")) || 0;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";

  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [designers, setDesigners] = useState<SearchDesigner[]>([]);
  const [categories, setCategories] = useState<SearchCategory[]>([]);
  const [matchedStores, setMatchedStores] = useState<SearchStore[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("relevance");

  useEffect(() => {
    setSelectedStore(null);
    setSort("relevance");

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

  // Unique stores from product results for filter chips
  const productStores = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of products) {
      if (!seen.has(p.storeSlug)) seen.set(p.storeSlug, p.storeName);
    }
    return Array.from(seen.entries()).map(([slug, name]) => ({ slug, name }));
  }, [products]);

  // Apply store filter + sort
  const displayProducts = useMemo(() => {
    let list = selectedStore
      ? products.filter((p) => p.storeSlug === selectedStore)
      : products;

    if (sort === "price-asc") {
      list = [...list].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (sort === "price-desc") {
      list = [...list].sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    }

    return list;
  }, [products, selectedStore, sort]);

  const hasQuickLinks = designers.length > 0 || categories.length > 0 || matchedStores.length > 0;

  return (
    <main className="bg-white min-h-screen text-black">
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-16">
          <h1 className="text-2xl sm:text-3xl font-serif mb-1">
            {q ? `Results for "${q}"` : "Search"}
          </h1>
          {!loading && q && (
            <p className="text-sm text-neutral-500">
              {displayProducts.length}{" "}
              {displayProducts.length === 1 ? "item" : "items"}
              {selectedStore && ` from ${productStores.find((s) => s.slug === selectedStore)?.name}`}
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
            <div className="flex flex-wrap gap-x-10 gap-y-6 mb-12 pb-10 border-b border-neutral-200">
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

          {/* No results */}
          {!loading && products.length === 0 && q && (
            <div className="text-center py-16">
              <p className="text-neutral-500 mb-2">No items found for &ldquo;{q}&rdquo;</p>
              <p className="text-sm text-neutral-400 mb-8">Try a designer name, item type, or browse a category below.</p>
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {["Clothing", "Bags", "Shoes", "Accessories"].map((cat) => (
                  <Link
                    key={cat}
                    href={`/categories/${cat.toLowerCase()}`}
                    className="border border-neutral-200 px-5 py-2.5 text-sm hover:bg-black hover:text-white hover:border-black transition-colors"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
              <Link
                href="/stores"
                className="inline-block text-sm text-neutral-500 underline hover:text-black transition-colors"
              >
                Browse all stores
              </Link>
            </div>
          )}

          {/* Filter + sort bar */}
          {!loading && products.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              {/* Store filter chips */}
              {productStores.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedStore(null)}
                    className={`px-4 py-1.5 text-xs uppercase tracking-wide border transition-colors ${
                      selectedStore === null
                        ? "bg-black text-white border-black"
                        : "border-neutral-300 hover:border-black"
                    }`}
                  >
                    All stores
                  </button>
                  {productStores.map((s) => (
                    <button
                      key={s.slug}
                      onClick={() => setSelectedStore(s.slug === selectedStore ? null : s.slug)}
                      className={`px-4 py-1.5 text-xs uppercase tracking-wide border transition-colors ${
                        selectedStore === s.slug
                          ? "bg-black text-white border-black"
                          : "border-neutral-300 hover:border-black"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="text-xs uppercase tracking-wide border border-neutral-300 px-3 py-1.5 bg-white outline-none hover:border-black transition-colors cursor-pointer ml-auto"
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          )}

          {/* Product grid */}
          {displayProducts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-12">
              {displayProducts.map((p) => (
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
                  <p className="text-sm mt-1 font-medium text-black">
                    {p.price}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {/* Filtered to zero */}
          {!loading && products.length > 0 && displayProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-500 text-sm">No items match this filter.</p>
              <button
                onClick={() => setSelectedStore(null)}
                className="mt-3 text-sm text-black underline"
              >
                Clear filter
              </button>
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
