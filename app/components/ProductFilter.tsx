"use client";

import { useState, useCallback } from "react";
import { Search, ChevronDown, X } from "lucide-react";

export type PriceRange = "all" | "under100" | "100to250" | "250to500" | "over500";
export type SortOption = "popular" | "newest" | "price-asc" | "price-desc";

export type FilterState = {
  search: string;
  priceRange: PriceRange;
  selectedStores: string[];
  selectedCategories: string[];
  selectedBrands: string[];
  sort: SortOption;
};

type ProductFilterProps = {
  stores: { slug: string; name: string }[];
  categories?: { slug: string; label: string }[];
  brands?: { slug: string; label: string }[];
  onFilterChange: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
  productCount?: number;
  showCategoryFilter?: boolean;
  showBrandFilter?: boolean;
};

const priceRangeLabels: Record<PriceRange, string> = {
  all: "All Prices",
  under100: "Under $100",
  "100to250": "$100 - $250",
  "250to500": "$250 - $500",
  over500: "$500+",
};

const sortLabels: Record<SortOption, string> = {
  popular: "Popular",
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
};

export default function ProductFilter({
  stores,
  categories = [],
  brands = [],
  onFilterChange,
  initialFilters,
  productCount,
  showCategoryFilter = false,
  showBrandFilter = false,
}: ProductFilterProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: initialFilters?.search ?? "",
    priceRange: initialFilters?.priceRange ?? "all",
    selectedStores: initialFilters?.selectedStores ?? [],
    selectedCategories: initialFilters?.selectedCategories ?? [],
    selectedBrands: initialFilters?.selectedBrands ?? [],
    sort: initialFilters?.sort ?? "popular",
  });

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [priceDropdownOpen, setPriceDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const closeAllDropdowns = useCallback(() => {
    setPriceDropdownOpen(false);
    setCategoryDropdownOpen(false);
    setBrandDropdownOpen(false);
    setStoreDropdownOpen(false);
    setSortDropdownOpen(false);
  }, []);

  const updateFilters = useCallback(
    (update: Partial<FilterState>) => {
      const newFilters = { ...filters, ...update };
      setFilters(newFilters);
      onFilterChange(newFilters);
    },
    [filters, onFilterChange]
  );

  const toggleStore = useCallback(
    (storeSlug: string) => {
      const current = filters.selectedStores;
      const updated = current.includes(storeSlug)
        ? current.filter((s) => s !== storeSlug)
        : [...current, storeSlug];
      updateFilters({ selectedStores: updated });
    },
    [filters.selectedStores, updateFilters]
  );

  const toggleCategory = useCallback(
    (categorySlug: string) => {
      const current = filters.selectedCategories;
      const updated = current.includes(categorySlug)
        ? current.filter((c) => c !== categorySlug)
        : [...current, categorySlug];
      updateFilters({ selectedCategories: updated });
    },
    [filters.selectedCategories, updateFilters]
  );

  const toggleBrand = useCallback(
    (brandSlug: string) => {
      const current = filters.selectedBrands;
      const updated = current.includes(brandSlug)
        ? current.filter((b) => b !== brandSlug)
        : [...current, brandSlug];
      updateFilters({ selectedBrands: updated });
    },
    [filters.selectedBrands, updateFilters]
  );

  const clearFilters = useCallback(() => {
    const cleared: FilterState = {
      search: "",
      priceRange: "all",
      selectedStores: [],
      selectedCategories: [],
      selectedBrands: [],
      sort: "popular",
    };
    setFilters(cleared);
    onFilterChange(cleared);
  }, [onFilterChange]);

  const hasActiveFilters =
    filters.search ||
    filters.priceRange !== "all" ||
    filters.selectedStores.length > 0 ||
    filters.selectedCategories.length > 0 ||
    filters.selectedBrands.length > 0;

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.priceRange !== "all" ? 1 : 0) +
    filters.selectedStores.length +
    filters.selectedCategories.length +
    filters.selectedBrands.length;

  return (
    <div className="mb-8">
      {/* Desktop Filters */}
      <div className="hidden md:block">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              placeholder="Search products or stores..."
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 text-sm focus:border-black focus:outline-none transition"
            />
            {filters.search && (
              <button
                onClick={() => updateFilters({ search: "" })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Price Range Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                const wasOpen = priceDropdownOpen;
                closeAllDropdowns();
                setPriceDropdownOpen(!wasOpen);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 border text-sm transition-all duration-200 ${
                filters.priceRange !== "all"
                  ? "border-black bg-black text-white"
                  : "border-neutral-200 hover:border-black"
              }`}
            >
              {priceRangeLabels[filters.priceRange]}
              <ChevronDown size={16} />
            </button>
            {priceDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setPriceDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-200 shadow-lg z-20 min-w-[160px] animate-fade-in">
                  {(Object.keys(priceRangeLabels) as PriceRange[]).map(
                    (range) => (
                      <button
                        key={range}
                        onClick={() => {
                          updateFilters({ priceRange: range });
                          setPriceDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 transition ${
                          filters.priceRange === range
                            ? "bg-neutral-100 font-medium"
                            : ""
                        }`}
                      >
                        {priceRangeLabels[range]}
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          {/* Category Dropdown */}
          {showCategoryFilter && categories.length > 0 && (
            <div className="relative">
              <button
                onClick={() => {
                  const wasOpen = categoryDropdownOpen;
                  closeAllDropdowns();
                  setCategoryDropdownOpen(!wasOpen);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 border text-sm transition-all duration-200 ${
                  filters.selectedCategories.length > 0
                    ? "border-black bg-black text-white"
                    : "border-neutral-200 hover:border-black"
                }`}
              >
                {filters.selectedCategories.length > 0
                  ? `Category (${filters.selectedCategories.length})`
                  : "Category"}
                <ChevronDown size={16} />
              </button>
              {categoryDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setCategoryDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-200 shadow-lg z-20 min-w-[180px] animate-fade-in">
                    {categories.map((cat) => (
                      <button
                        key={cat.slug}
                        onClick={() => toggleCategory(cat.slug)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 transition flex items-center justify-between ${
                          filters.selectedCategories.includes(cat.slug)
                            ? "bg-neutral-100 font-medium"
                            : ""
                        }`}
                      >
                        {cat.label}
                        {filters.selectedCategories.includes(cat.slug) && (
                          <span className="text-black">&#10003;</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Brand Dropdown */}
          {showBrandFilter && brands.length > 0 && (
            <div className="relative">
              <button
                onClick={() => {
                  const wasOpen = brandDropdownOpen;
                  closeAllDropdowns();
                  setBrandDropdownOpen(!wasOpen);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 border text-sm transition-all duration-200 ${
                  filters.selectedBrands.length > 0
                    ? "border-black bg-black text-white"
                    : "border-neutral-200 hover:border-black"
                }`}
              >
                {filters.selectedBrands.length > 0
                  ? `Brand (${filters.selectedBrands.length})`
                  : "Brand"}
                <ChevronDown size={16} />
              </button>
              {brandDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setBrandDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-200 shadow-lg z-20 min-w-[200px] max-h-[300px] overflow-y-auto animate-fade-in">
                    {brands.map((brand) => (
                      <button
                        key={brand.slug}
                        onClick={() => toggleBrand(brand.slug)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 transition flex items-center justify-between ${
                          filters.selectedBrands.includes(brand.slug)
                            ? "bg-neutral-100 font-medium"
                            : ""
                        }`}
                      >
                        {brand.label}
                        {filters.selectedBrands.includes(brand.slug) && (
                          <span className="text-black">&#10003;</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Store Dropdown */}
          {stores.length > 1 && (
            <div className="relative">
              <button
                onClick={() => {
                  const wasOpen = storeDropdownOpen;
                  closeAllDropdowns();
                  setStoreDropdownOpen(!wasOpen);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 border text-sm transition-all duration-200 ${
                  filters.selectedStores.length > 0
                    ? "border-black bg-black text-white"
                    : "border-neutral-200 hover:border-black"
                }`}
              >
                {filters.selectedStores.length > 0
                  ? `Store (${filters.selectedStores.length})`
                  : "Store"}
                <ChevronDown size={16} />
              </button>
              {storeDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setStoreDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-200 shadow-lg z-20 min-w-[200px] animate-fade-in">
                    {stores.map((store) => (
                      <button
                        key={store.slug}
                        onClick={() => toggleStore(store.slug)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 transition flex items-center justify-between ${
                          filters.selectedStores.includes(store.slug)
                            ? "bg-neutral-100 font-medium"
                            : ""
                        }`}
                      >
                        {store.name}
                        {filters.selectedStores.includes(store.slug) && (
                          <span className="text-black">&#10003;</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Sort Dropdown */}
          <div className="relative ml-auto">
            <button
              onClick={() => {
                const wasOpen = sortDropdownOpen;
                closeAllDropdowns();
                setSortDropdownOpen(!wasOpen);
              }}
              className="flex items-center gap-2 px-4 py-2.5 border border-neutral-200 text-sm hover:border-black transition-all duration-200"
            >
              Sort: {sortLabels[filters.sort]}
              <ChevronDown size={16} />
            </button>
            {sortDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setSortDropdownOpen(false)}
                />
                <div className="absolute top-full right-0 mt-1 bg-white border border-neutral-200 shadow-lg z-20 min-w-[180px] animate-fade-in">
                  {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        updateFilters({ sort: option });
                        setSortDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 transition ${
                        filters.sort === option
                          ? "bg-neutral-100 font-medium"
                          : ""
                      }`}
                    >
                      {sortLabels[option]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Active Filters & Clear */}
        {hasActiveFilters && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-neutral-100">
            <span className="text-xs uppercase tracking-wide text-neutral-500">
              {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}{" "}
              active
            </span>
            <button
              onClick={clearFilters}
              className="text-xs uppercase tracking-wide underline hover:no-underline"
            >
              Clear all
            </button>
            {productCount !== undefined && (
              <span className="ml-auto text-sm text-neutral-600">
                {productCount} product{productCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Mobile Filters */}
      <div className="md:hidden">
        {/* Mobile Search */}
        <div className="relative mb-3">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-3 border border-neutral-200 text-sm focus:border-black focus:outline-none transition"
          />
        </div>

        {/* Mobile Filter Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border text-sm transition ${
              hasActiveFilters
                ? "border-black bg-black text-white"
                : "border-neutral-200"
            }`}
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-white text-black px-1.5 py-0.5 text-xs rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Mobile Sort */}
          <select
            value={filters.sort}
            onChange={(e) =>
              updateFilters({ sort: e.target.value as SortOption })
            }
            className="flex-1 py-3 px-4 border border-neutral-200 text-sm focus:border-black focus:outline-none bg-white"
          >
            {(Object.keys(sortLabels) as SortOption[]).map((option) => (
              <option key={option} value={option}>
                {sortLabels[option]}
              </option>
            ))}
          </select>
        </div>

        {/* Mobile Filter Panel */}
        {mobileFiltersOpen && (
          <div className="mt-4 p-4 border border-neutral-200 bg-neutral-50">
            {/* Price Range */}
            <div className="mb-6">
              <h4 className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
                Price Range
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(priceRangeLabels) as PriceRange[]).map(
                  (range) => (
                    <button
                      key={range}
                      onClick={() => updateFilters({ priceRange: range })}
                      className={`px-3 py-2 text-sm border transition ${
                        filters.priceRange === range
                          ? "border-black bg-black text-white"
                          : "border-neutral-200 bg-white hover:border-black"
                      }`}
                    >
                      {priceRangeLabels[range]}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Categories */}
            {showCategoryFilter && categories.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
                  Categories
                </h4>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <label
                      key={cat.slug}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.selectedCategories.includes(cat.slug)}
                        onChange={() => toggleCategory(cat.slug)}
                        className="w-4 h-4 border-neutral-300 rounded focus:ring-black accent-black"
                      />
                      <span className="text-sm">{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Brands */}
            {showBrandFilter && brands.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
                  Brands
                </h4>
                <div className="space-y-2">
                  {brands.map((brand) => (
                    <label
                      key={brand.slug}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.selectedBrands.includes(brand.slug)}
                        onChange={() => toggleBrand(brand.slug)}
                        className="w-4 h-4 border-neutral-300 rounded focus:ring-black accent-black"
                      />
                      <span className="text-sm">{brand.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Stores */}
            {stores.length > 1 && (
              <div className="mb-6">
                <h4 className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
                  Stores
                </h4>
                <div className="space-y-2">
                  {stores.map((store) => (
                    <label
                      key={store.slug}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.selectedStores.includes(store.slug)}
                        onChange={() => toggleStore(store.slug)}
                        className="w-4 h-4 border-neutral-300 rounded focus:ring-black accent-black"
                      />
                      <span className="text-sm">{store.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-neutral-200">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex-1 py-2.5 text-sm border border-neutral-200 hover:border-black transition"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 py-2.5 text-sm bg-black text-white"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Results Count (Mobile) */}
        {productCount !== undefined && (
          <p className="mt-3 text-sm text-neutral-600">
            {productCount} product{productCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
