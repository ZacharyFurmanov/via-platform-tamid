"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import FilteredProductGrid from "./FilteredProductGrid";
import type { FilterableProduct } from "./FilteredProductGrid";

type StoreCount = { slug: string; name: string; count: number };
type BrandCount = { slug: string; label: string; count: number };

type Props = {
  label: string;
  products: FilterableProduct[];
  stores: { slug: string; name: string }[];
  storeCounts: StoreCount[];
  brandCounts: BrandCount[];
  categories?: { slug: string; label: string }[];
  showCategoryFilter?: boolean;
  showSizeFilter?: boolean;
  showTypeFilter?: boolean;
  from?: string;
  emptyMessage?: string;
};

export default function CategoryContent({
  label,
  products,
  stores,
  storeCounts,
  brandCounts,
  categories = [],
  showCategoryFilter = false,
  showSizeFilter = false,
  showTypeFilter = false,
  from,
  emptyMessage,
}: Props) {
  const [activeStore, setActiveStore] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);

  const visibleProducts = useMemo(() => {
    let result = products;
    if (activeStore) result = result.filter((p) => p.storeSlug === activeStore);
    if (activeBrand) result = result.filter((p) => p.brand === activeBrand);
    return result;
  }, [products, activeStore, activeBrand]);

  function toggleStore(slug: string) {
    setActiveStore((prev) => (prev === slug ? null : slug));
    setActiveBrand(null);
  }

  function toggleBrand(slug: string) {
    setActiveBrand((prev) => (prev === slug ? null : slug));
    setActiveStore(null);
  }

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      {/* Header */}
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <Link
            href="/categories"
            className="inline-block mb-6 text-xs tracking-[0.25em] uppercase text-[#5D0F17]/50 hover:text-[#5D0F17] transition"
          >
            &larr; All Categories
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif mb-2">{label}</h1>
          <p className="text-sm sm:text-base text-[#5D0F17]/60 max-w-2xl">
            {label} from independent vintage and secondhand stores.
          </p>

          {/* Store pills */}
          {storeCounts.length > 0 && (
            <div className="mt-6 overflow-x-auto scrollbar-hide -mx-6 px-6">
              <div className="flex gap-2">
                {storeCounts.map((s) => {
                  const active = activeStore === s.slug;
                  return (
                    <button
                      key={s.slug}
                      onClick={() => toggleStore(s.slug)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs uppercase tracking-[0.1em] whitespace-nowrap transition-colors cursor-pointer ${
                        active
                          ? "bg-[#5D0F17] text-[#F7F3EA]"
                          : "bg-[#D8CABD]/30 text-[#5D0F17]/70 hover:bg-[#D8CABD]/60"
                      }`}
                    >
                      {s.name}
                      <span className={active ? "text-[#F7F3EA]/60" : "text-[#5D0F17]/40"}>
                        {s.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Brand pills */}
          {brandCounts.length > 0 && (
            <div className="mt-3 overflow-x-auto scrollbar-hide -mx-6 px-6">
              <div className="flex gap-2">
                {brandCounts.map((brand) => {
                  const active = activeBrand === brand.slug;
                  return (
                    <button
                      key={brand.slug}
                      onClick={() => toggleBrand(brand.slug)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 border text-xs uppercase tracking-[0.1em] whitespace-nowrap transition-colors cursor-pointer ${
                        active
                          ? "border-[#5D0F17] bg-[#5D0F17] text-[#F7F3EA]"
                          : "border-[#5D0F17]/15 text-[#5D0F17]/70 hover:border-[#5D0F17]/40"
                      }`}
                    >
                      {brand.label}
                      <span className={active ? "text-[#F7F3EA]/60" : "text-[#5D0F17]/40"}>
                        {brand.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Products */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <FilteredProductGrid
            products={visibleProducts}
            stores={stores}
            categories={categories}
            showCategoryFilter={showCategoryFilter}
            showSizeFilter={showSizeFilter}
            showTypeFilter={showTypeFilter}
            from={from}
            emptyMessage={emptyMessage}
          />
        </div>
      </section>
    </main>
  );
}
