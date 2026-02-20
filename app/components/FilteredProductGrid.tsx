"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import ProductFilter, {
  FilterState,
  PriceRange,
  SortOption,
} from "./ProductFilter";
import ProductCard from "./ProductCard";
import type { CategoryLabel } from "@/app/lib/categoryMap";
import { diversityInterleave } from "@/app/lib/productRanking";

export type FilterableProduct = {
  id: string;
  dbId?: number;
  title: string;
  price: number;
  category: string;
  categoryLabel: CategoryLabel;
  brand?: string | null;
  brandLabel?: string | null;
  store: string;
  storeSlug: string;
  externalUrl?: string;
  image: string;
  images?: string[];
  createdAt?: number; // timestamp for sorting by newest
  popularityScore?: number;
};

type FilteredProductGridProps = {
  products: FilterableProduct[];
  stores: { slug: string; name: string }[];
  categories?: { slug: string; label: string }[];
  showCategoryFilter?: boolean;
  showBrandFilter?: boolean;
  emptyMessage?: string;
  from?: string;
};

function matchesPriceRange(price: number, range: PriceRange): boolean {
  switch (range) {
    case "all":
      return true;
    case "under100":
      return price < 100;
    case "100to250":
      return price >= 100 && price < 250;
    case "250to500":
      return price >= 250 && price < 500;
    case "over500":
      return price >= 500;
    default:
      return true;
  }
}

function sortProducts(
  products: FilterableProduct[],
  sort: SortOption
): FilterableProduct[] {
  const sorted = [...products];
  switch (sort) {
    case "popular": {
      // Sort by composite score, then interleave by store so items
      // from different stores alternate (prevents clustering)
      sorted.sort((a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0));
      return diversityInterleave(sorted, (p) => p.storeSlug, 2);
    }
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "newest":
    default:
      return sorted.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt - a.createdAt;
        }
        return b.id.localeCompare(a.id);
      });
  }
}

export default function FilteredProductGrid({
  products,
  stores,
  categories = [],
  showCategoryFilter = false,
  showBrandFilter = false,
  emptyMessage = "No products found.",
  from,
}: FilteredProductGridProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    priceRange: "all",
    selectedStores: [],
    selectedCategories: [],
    selectedBrands: [],
    sort: "popular",
  });

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products;

    // Search filter (title and store name)
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.store.toLowerCase().includes(query)
      );
    }

    // Price range filter
    if (filters.priceRange !== "all") {
      result = result.filter((p) =>
        matchesPriceRange(p.price, filters.priceRange)
      );
    }

    // Category filter
    if (filters.selectedCategories.length > 0) {
      result = result.filter((p) =>
        filters.selectedCategories.includes(p.category)
      );
    }

    // Store filter
    if (filters.selectedStores.length > 0) {
      result = result.filter((p) =>
        filters.selectedStores.includes(p.storeSlug)
      );
    }

    // Brand filter
    if (filters.selectedBrands.length > 0) {
      result = result.filter(
        (p) => p.brand && filters.selectedBrands.includes(p.brand)
      );
    }

    // Sort
    result = sortProducts(result, filters.sort);

    return result;
  }, [products, filters]);

  // Get unique stores from products for the filter
  const availableStores = useMemo(() => {
    const storeMap = new Map<string, { slug: string; name: string }>();
    products.forEach((p) => {
      if (!storeMap.has(p.storeSlug)) {
        storeMap.set(p.storeSlug, { slug: p.storeSlug, name: p.store });
      }
    });
    return Array.from(storeMap.values());
  }, [products]);

  // Get unique categories from products for the filter
  const availableCategories = useMemo(() => {
    const catMap = new Map<string, { slug: string; label: string }>();
    products.forEach((p) => {
      if (!catMap.has(p.category)) {
        catMap.set(p.category, { slug: p.category, label: p.categoryLabel });
      }
    });
    return Array.from(catMap.values());
  }, [products]);

  // Get unique brands from products for the filter
  const availableBrands = useMemo(() => {
    const bMap = new Map<string, { slug: string; label: string }>();
    products.forEach((p) => {
      if (p.brand && p.brandLabel && !bMap.has(p.brand)) {
        bMap.set(p.brand, { slug: p.brand, label: p.brandLabel });
      }
    });
    return Array.from(bMap.values());
  }, [products]);

  // Fetch favorite counts for all products
  const [favCounts, setFavCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    const dbIds = products
      .map((p) => {
        if (p.dbId) return p.dbId;
        const match = p.id.match(/-(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((id): id is number => id != null);

    if (dbIds.length === 0) return;

    fetch(`/api/favorites/counts?ids=${dbIds.join(",")}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.counts) setFavCounts(data.counts);
      })
      .catch(() => {});
  }, [products]);

  return (
    <div>
      <ProductFilter
        stores={availableStores.length > 0 ? availableStores : stores}
        categories={
          availableCategories.length > 0 ? availableCategories : categories
        }
        brands={availableBrands}
        showCategoryFilter={showCategoryFilter}
        showBrandFilter={showBrandFilter}
        onFilterChange={handleFilterChange}
        productCount={filteredProducts.length}
      />

      {filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-black/70 mb-4">{emptyMessage}</p>
          {filters.search ||
          filters.priceRange !== "all" ||
          filters.selectedStores.length > 0 ||
          filters.selectedCategories.length > 0 ||
          filters.selectedBrands.length > 0 ? (
            <button
              onClick={() =>
                handleFilterChange({
                  search: "",
                  priceRange: "all",
                  selectedStores: [],
                  selectedCategories: [],
                  selectedBrands: [],
                  sort: filters.sort,
                })
              }
              className="text-sm uppercase tracking-wide underline hover:no-underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {filteredProducts.map((product, i) => (
            <div
              key={product.id}
              className={`group ${i % 5 === 0 ? "col-span-2 md:col-span-1" : "col-span-1"}`}
            >
              <ProductCard
                id={product.id}
                dbId={product.dbId}
                name={product.title}
                price={`$${Math.round(product.price)}`}
                category={product.categoryLabel}
                storeName={product.store}
                storeSlug={product.storeSlug}
                externalUrl={product.externalUrl}
                image={product.image}
                images={product.images}
                from={from}
                favoriteCount={
                  favCounts[
                    product.dbId ??
                      (() => {
                        const m = product.id.match(/-(\d+)$/);
                        return m ? parseInt(m[1], 10) : 0;
                      })()
                  ]
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
