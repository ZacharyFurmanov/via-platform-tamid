"use client";

import { useState, useMemo } from "react";
import FilteredProductGrid from "./FilteredProductGrid";
import type { FilterableProduct } from "./FilteredProductGrid";
import { clothingSlugs } from "@/app/lib/categoryMap";
import type { CategorySlug } from "@/app/lib/categoryMap";

type StoreClientSectionProps = {
  products: FilterableProduct[];
  categoryCounts: { label: string; count: number }[];
  brandCounts: { label: string; count: number }[];
  store: { slug: string; name: string };
};

export default function StoreClientSection({
  products,
  categoryCounts,
  brandCounts,
  store,
}: StoreClientSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);

  // Recompute brand counts when a category is active
  const visibleBrandCounts = useMemo(() => {
    if (!activeCategory) return brandCounts;
    const map = new Map<string, number>();
    for (const p of products) {
      const displayCat = clothingSlugs.has(p.category as CategorySlug)
        ? "Clothing"
        : p.categoryLabel || p.category;
      if (displayCat !== activeCategory) continue;
      if (p.brandLabel) {
        map.set(p.brandLabel, (map.get(p.brandLabel) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [products, activeCategory, brandCounts]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (activeCategory) {
        const displayCat = clothingSlugs.has(p.category as CategorySlug)
          ? "Clothing"
          : p.categoryLabel || p.category;
        if (displayCat !== activeCategory) return false;
      }
      if (activeBrand && p.brandLabel !== activeBrand) return false;
      return true;
    });
  }, [products, activeCategory, activeBrand]);

  const toggleCategory = (label: string) => {
    const next = activeCategory === label ? null : label;
    setActiveCategory(next);
    // Clear brand if it's no longer in the new category
    if (next !== null && activeBrand) {
      const stillValid = visibleBrandCounts.some((b) => b.label === activeBrand);
      if (!stillValid) setActiveBrand(null);
    }
  };

  const toggleBrand = (label: string) => {
    setActiveBrand((prev) => (prev === label ? null : label));
  };

  return (
    <div>
      {/* Pills row */}
      <div className="border-b border-neutral-100 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          {/* Category pills */}
          {categoryCounts.length > 0 && (
            <div className="overflow-x-auto scrollbar-hide -mx-6 px-6">
              <div className="flex gap-2 py-3">
                {categoryCounts.map((cat) => (
                  <button
                    key={cat.label}
                    onClick={() => toggleCategory(cat.label)}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-[11px] uppercase tracking-widest whitespace-nowrap transition-all duration-150 ${
                      activeCategory === cat.label
                        ? "border-black text-black"
                        : "border-neutral-200 text-black/50 hover:border-neutral-400 hover:text-black/70"
                    }`}
                  >
                    {cat.label}
                    <span className={activeCategory === cat.label ? "text-black/40" : "text-black/25"}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Brand pills */}
          {visibleBrandCounts.length > 0 && (
            <div className="overflow-x-auto scrollbar-hide -mx-6 px-6">
              <div className="flex gap-2 pb-3">
                {visibleBrandCounts.map((brand) => (
                  <button
                    key={brand.label}
                    onClick={() => toggleBrand(brand.label)}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-[11px] uppercase tracking-widest whitespace-nowrap transition-all duration-150 ${
                      activeBrand === brand.label
                        ? "border-black text-black"
                        : "border-neutral-200 text-black/50 hover:border-neutral-400 hover:text-black/70"
                    }`}
                  >
                    {brand.label}
                    <span className={activeBrand === brand.label ? "text-black/40" : "text-black/25"}>
                      {brand.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product grid */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <FilteredProductGrid
            products={filteredProducts}
            stores={[store]}
            showCategoryFilter
            showBrandFilter
            emptyMessage="No products found."
            from="store"
          />
        </div>
      </section>
    </div>
  );
}
