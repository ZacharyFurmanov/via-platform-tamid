"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import ProductCard from "@/app/components/ProductCard";
import TrackedStoreLink from "@/app/components/TrackedStoreLink";
import { trackSearchResults } from "@/app/lib/firebase-analytics";

type SearchProduct = {
  id: number;
  name: string;
  storeSlug: string;
  storeName: string;
  price: string;
  image?: string;
  images?: string[];
};

type SearchDesigner = { slug: string; label: string };
type SearchCategory = { slug: string; label: string };
type SearchStore = { slug: string; name: string; location: string };

type SortOption = "relevance" | "price-asc" | "price-desc";

function parsePrice(price: string): number {
  return Number(price.replace(/[^0-9.]/g, "")) || 0;
}

function SearchResultsContent({ q }: { q: string }) {
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [designers, setDesigners] = useState<SearchDesigner[]>([]);
  const [categories, setCategories] = useState<SearchCategory[]>([]);
  const [matchedStores, setMatchedStores] = useState<SearchStore[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("relevance");

  useEffect(() => {
    if (!q.trim()) {
      queueMicrotask(() => {
        setProducts([]);
        setDesigners([]);
        setCategories([]);
        setMatchedStores([]);
        setLoading(false);
      });
      return;
    }

    queueMicrotask(() => setLoading(true));
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

  useEffect(() => {
    if (loading || !q.trim()) {
      return;
    }

    trackSearchResults({
      searchTerm: q.trim(),
      resultsCount: products.length,
      displayedCount: displayProducts.length,
      storeCount: matchedStores.length,
      designerCount: designers.length,
      categoryCount: categories.length,
      selectedStore,
      sort,
    });
  }, [
    categories.length,
    designers.length,
    displayProducts.length,
    loading,
    matchedStores.length,
    products.length,
    q,
    selectedStore,
    sort,
  ]);

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-16">
          <h1 className="text-2xl sm:text-3xl font-serif mb-1">
            {q ? `Results for "${q}"` : "Search"}
          </h1>
          {!loading && q && (
            <p className="text-sm text-[#5D0F17]/50">
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
            <p className="text-sm text-[#5D0F17]/40">Searching...</p>
          )}

          {/* Quick links: Designers, Categories, Stores */}
          {!loading && hasQuickLinks && (
            <div className="flex flex-wrap gap-x-10 gap-y-6 mb-12 pb-10 border-b border-[#5D0F17]/10">
              {designers.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 mb-3">Designers</p>
                  <div className="flex flex-wrap gap-2">
                    {designers.map((d) => (
                      <Link
                        key={d.slug}
                        href={`/brands/${d.slug}`}
                        className="inline-block border border-[#5D0F17]/20 px-4 py-2 text-sm hover:bg-[#5D0F17] hover:text-[#F7F3EA] hover:border-[#5D0F17] transition-colors"
                      >
                        {d.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {categories.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 mb-3">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/categories/${c.slug}`}
                        className="inline-block border border-[#5D0F17]/20 px-4 py-2 text-sm hover:bg-[#5D0F17] hover:text-[#F7F3EA] hover:border-[#5D0F17] transition-colors"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {matchedStores.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 mb-3">Stores</p>
                  <div className="flex flex-wrap gap-2">
                    {matchedStores.map((s) => (
                      <TrackedStoreLink
                        key={s.slug}
                        href={`/stores/${s.slug}`}
                        storeSlug={s.slug}
                        storeName={s.name}
                        surface="search_results"
                        className="inline-block border border-[#5D0F17]/20 px-4 py-2 text-sm hover:bg-[#5D0F17] hover:text-[#F7F3EA] hover:border-[#5D0F17] transition-colors"
                      >
                        {s.name}
                      </TrackedStoreLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No results */}
          {!loading && products.length === 0 && q && (
            <div className="text-center py-16">
              <p className="text-[#5D0F17]/50 mb-2">No items found for &ldquo;{q}&rdquo;</p>
              <p className="text-sm text-[#5D0F17]/40 mb-8">Try a designer name, item type, or browse a category below.</p>
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {["Clothing", "Bags", "Shoes", "Accessories"].map((cat) => (
                  <Link
                    key={cat}
                    href={`/categories/${cat.toLowerCase()}`}
                    className="border border-[#5D0F17]/20 px-5 py-2.5 text-sm hover:bg-[#5D0F17] hover:text-[#F7F3EA] hover:border-[#5D0F17] transition-colors"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
              <Link
                href="/stores"
                className="inline-block text-sm text-[#5D0F17]/50 underline hover:text-[#5D0F17] transition-colors"
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
                        ? "bg-[#5D0F17] text-[#F7F3EA] border-[#5D0F17]"
                        : "border-[#5D0F17]/20 hover:border-[#5D0F17]"
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
                          ? "bg-[#5D0F17] text-[#F7F3EA] border-[#5D0F17]"
                          : "border-[#5D0F17]/20 hover:border-[#5D0F17]"
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
                className="text-xs uppercase tracking-wide border border-[#5D0F17]/20 px-3 py-1.5 bg-[#F7F3EA] text-[#5D0F17] outline-none hover:border-[#5D0F17] transition-colors cursor-pointer ml-auto"
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
                <ProductCard
                  key={p.id}
                  id={`${p.storeSlug}-${p.id}`}
                  dbId={p.id}
                  name={p.name}
                  price={p.price}
                  category="Clothing"
                  storeName={p.storeName}
                  storeSlug={p.storeSlug}
                  image={p.image ?? ""}
                  images={p.images}
                  from="search"
                />
              ))}
            </div>
          )}

          {/* Filtered to zero */}
          {!loading && products.length > 0 && displayProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#5D0F17]/50 text-sm">No items match this filter.</p>
              <button
                onClick={() => setSelectedStore(null)}
                className="mt-3 text-sm text-[#5D0F17] underline"
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

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";

  return <SearchResultsContent key={q} q={q} />;
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <p className="text-sm text-[#5D0F17]/40">Loading...</p>
          </div>
        </main>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
