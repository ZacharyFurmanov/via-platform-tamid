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
  selectedSizes: string[];
  selectedTypes: string[];
  selectedColors: string[];
  sort: SortOption;
};

type ProductFilterProps = {
  stores: { slug: string; name: string }[];
  categories?: { slug: string; label: string }[];
  brands?: { slug: string; label: string }[];
  sizes?: string[];
  types?: string[];
  colors?: string[];
  onFilterChange: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
  productCount?: number;
  showCategoryFilter?: boolean;
  showBrandFilter?: boolean;
  showSizeFilter?: boolean;
  showTypeFilter?: boolean;
  showColorFilter?: boolean;
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
  sizes = [],
  types = [],
  colors = [],
  onFilterChange,
  initialFilters,
  productCount,
  showCategoryFilter = false,
  showBrandFilter = false,
  showSizeFilter = false,
  showTypeFilter = false,
  showColorFilter = false,
}: ProductFilterProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: initialFilters?.search ?? "",
    priceRange: initialFilters?.priceRange ?? "all",
    selectedStores: initialFilters?.selectedStores ?? [],
    selectedCategories: initialFilters?.selectedCategories ?? [],
    selectedBrands: initialFilters?.selectedBrands ?? [],
    selectedSizes: initialFilters?.selectedSizes ?? [],
    selectedTypes: initialFilters?.selectedTypes ?? [],
    selectedColors: initialFilters?.selectedColors ?? [],
    sort: initialFilters?.sort ?? "popular",
  });

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [openMobileSections, setOpenMobileSections] = useState<Set<string>>(new Set());
  const [priceDropdownOpen, setPriceDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const toggleMobileSection = useCallback((section: string) => {
    setOpenMobileSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const closeAllDropdowns = useCallback(() => {
    setPriceDropdownOpen(false);
    setCategoryDropdownOpen(false);
    setBrandDropdownOpen(false);
    setStoreDropdownOpen(false);
    setSizeDropdownOpen(false);
    setTypeDropdownOpen(false);
    setColorDropdownOpen(false);
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

  const toggleSize = useCallback(
    (size: string) => {
      const current = filters.selectedSizes;
      const updated = current.includes(size)
        ? current.filter((s) => s !== size)
        : [...current, size];
      updateFilters({ selectedSizes: updated });
    },
    [filters.selectedSizes, updateFilters]
  );

  const toggleType = useCallback(
    (type: string) => {
      const current = filters.selectedTypes;
      const updated = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      updateFilters({ selectedTypes: updated });
    },
    [filters.selectedTypes, updateFilters]
  );

  const toggleColor = useCallback(
    (color: string) => {
      const current = filters.selectedColors;
      const updated = current.includes(color)
        ? current.filter((c) => c !== color)
        : [...current, color];
      updateFilters({ selectedColors: updated });
    },
    [filters.selectedColors, updateFilters]
  );

  const clearFilters = useCallback(() => {
    const cleared: FilterState = {
      search: "",
      priceRange: "all",
      selectedStores: [],
      selectedCategories: [],
      selectedBrands: [],
      selectedSizes: [],
      selectedTypes: [],
      selectedColors: [],
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
    filters.selectedBrands.length > 0 ||
    filters.selectedSizes.length > 0 ||
    filters.selectedTypes.length > 0 ||
    filters.selectedColors.length > 0;

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.priceRange !== "all" ? 1 : 0) +
    filters.selectedStores.length +
    filters.selectedCategories.length +
    filters.selectedBrands.length +
    filters.selectedSizes.length +
    filters.selectedTypes.length +
    filters.selectedColors.length;

  // Helper for mobile accordion section header
  function MobileSection({
    id,
    label,
    activeCount,
    children,
  }: {
    id: string;
    label: string;
    activeCount?: number;
    children: React.ReactNode;
  }) {
    const isOpen = openMobileSections.has(id);
    return (
      <div className="border-b border-[#5D0F17]/10 last:border-b-0">
        <button
          onClick={() => toggleMobileSection(id)}
          className="w-full flex items-center justify-between py-3.5"
        >
          <span className="text-xs uppercase tracking-wide text-[#5D0F17]/60 font-medium">
            {label}
            {activeCount ? (
              <span className="ml-2 bg-[#5D0F17] text-[#F7F3EA] text-[10px] px-1.5 py-0.5">
                {activeCount}
              </span>
            ) : null}
          </span>
          <ChevronDown
            size={14}
            className={`text-[#5D0F17]/40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {isOpen && <div className="pb-4">{children}</div>}
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Desktop Filters */}
      <div className="hidden md:block">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5D0F17]/40"
            />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              placeholder="Search products or stores..."
              className="w-full pl-10 pr-4 py-2.5 border border-[#5D0F17]/20 text-sm focus:border-[#5D0F17] focus:outline-none bg-transparent transition"
            />
            {filters.search && (
              <button
                onClick={() => updateFilters({ search: "" })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5D0F17]/40 hover:text-[#5D0F17]"
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
                  ? "border-[#5D0F17] bg-[#5D0F17] text-[#F7F3EA]"
                  : "border-[#5D0F17]/20 hover:border-[#5D0F17]"
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
                <div className="absolute top-full left-0 mt-1 bg-[#F7F3EA] border border-[#5D0F17]/20 shadow-lg z-20 min-w-[160px] animate-fade-in">
                  {(Object.keys(priceRangeLabels) as PriceRange[]).map(
                    (range) => (
                      <button
                        key={range}
                        onClick={() => {
                          updateFilters({ priceRange: range });
                          setPriceDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#D8CABD]/20 transition ${
                          filters.priceRange === range
                            ? "bg-[#D8CABD]/30 font-medium"
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
                    ? "border-[#5D0F17] bg-[#5D0F17] text-[#F7F3EA]"
                    : "border-[#5D0F17]/20 hover:border-[#5D0F17]"
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
                  <div className="absolute top-full left-0 mt-1 bg-[#F7F3EA] border border-[#5D0F17]/20 shadow-lg z-20 min-w-[180px] animate-fade-in">
                    {categories.map((cat) => (
                      <button
                        key={cat.slug}
                        onClick={() => toggleCategory(cat.slug)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#D8CABD]/20 transition flex items-center justify-between ${
                          filters.selectedCategories.includes(cat.slug)
                            ? "bg-[#D8CABD]/30 font-medium"
                            : ""
                        }`}
                      >
                        {cat.label}
                        {filters.selectedCategories.includes(cat.slug) && (
                          <span className="text-[#5D0F17]">&#10003;</span>
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
                    ? "border-[#5D0F17] bg-[#5D0F17] text-[#F7F3EA]"
                    : "border-[#5D0F17]/20 hover:border-[#5D0F17]"
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
                  <div className="absolute top-full left-0 mt-1 bg-[#F7F3EA] border border-[#5D0F17]/20 shadow-lg z-20 min-w-[200px] max-h-[300px] overflow-y-auto animate-fade-in">
                    {brands.map((brand) => (
                      <button
                        key={brand.slug}
                        onClick={() => toggleBrand(brand.slug)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#D8CABD]/20 transition flex items-center justify-between ${
                          filters.selectedBrands.includes(brand.slug)
                            ? "bg-[#D8CABD]/30 font-medium"
                            : ""
                        }`}
                      >
                        {brand.label}
                        {filters.selectedBrands.includes(brand.slug) && (
                          <span className="text-[#5D0F17]">&#10003;</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Color Dropdown */}
          {showColorFilter && colors.length > 0 && (
            <div className="relative">
              <button
                onClick={() => {
                  const wasOpen = colorDropdownOpen;
                  closeAllDropdowns();
                  setColorDropdownOpen(!wasOpen);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 border text-sm transition-all duration-200 ${
                  filters.selectedColors.length > 0
                    ? "border-[#5D0F17] bg-[#5D0F17] text-[#F7F3EA]"
                    : "border-[#5D0F17]/20 hover:border-[#5D0F17]"
                }`}
              >
                {filters.selectedColors.length > 0
                  ? `Color (${filters.selectedColors.length})`
                  : "Color"}
                <ChevronDown size={16} />
              </button>
              {colorDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setColorDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 bg-[#F7F3EA] border border-[#5D0F17]/20 shadow-lg z-20 min-w-[160px] max-h-[300px] overflow-y-auto animate-fade-in">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => toggleColor(color)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#D8CABD]/20 transition flex items-center justify-between ${
                          filters.selectedColors.includes(color)
                            ? "bg-[#D8CABD]/30 font-medium"
                            : ""
                        }`}
                      >
                        {color}
                        {filters.selectedColors.includes(color) && (
                          <span className="text-[#5D0F17]">&#10003;</span>
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
                    ? "border-[#5D0F17] bg-[#5D0F17] text-[#F7F3EA]"
                    : "border-[#5D0F17]/20 hover:border-[#5D0F17]"
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
                  <div className="absolute top-full left-0 mt-1 bg-[#F7F3EA] border border-[#5D0F17]/20 shadow-lg z-20 min-w-[200px] animate-fade-in">
                    {stores.map((store) => (
                      <button
                        key={store.slug}
                        onClick={() => toggleStore(store.slug)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#D8CABD]/20 transition flex items-center justify-between ${
                          filters.selectedStores.includes(store.slug)
                            ? "bg-[#D8CABD]/30 font-medium"
                            : ""
                        }`}
                      >
                        {store.name}
                        {filters.selectedStores.includes(store.slug) && (
                          <span className="text-[#5D0F17]">&#10003;</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Size Dropdown */}
          {showSizeFilter && sizes.length > 0 && (
            <div className="relative">
              <button
                onClick={() => {
                  const wasOpen = sizeDropdownOpen;
                  closeAllDropdowns();
                  setSizeDropdownOpen(!wasOpen);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 border text-sm transition-all duration-200 ${
                  filters.selectedSizes.length > 0
                    ? "border-[#5D0F17] bg-[#5D0F17] text-[#F7F3EA]"
                    : "border-[#5D0F17]/20 hover:border-[#5D0F17]"
                }`}
              >
                {filters.selectedSizes.length > 0
                  ? `Size (${filters.selectedSizes.length})`
                  : "Size"}
                <ChevronDown size={16} />
              </button>
              {sizeDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setSizeDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 bg-[#F7F3EA] border border-[#5D0F17]/20 shadow-lg z-20 min-w-[160px] max-h-[300px] overflow-y-auto animate-fade-in">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => toggleSize(size)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#D8CABD]/20 transition flex items-center justify-between ${
                          filters.selectedSizes.includes(size)
                            ? "bg-[#D8CABD]/30 font-medium"
                            : ""
                        }`}
                      >
                        {size}
                        {filters.selectedSizes.includes(size) && (
                          <span className="text-[#5D0F17]">&#10003;</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Type Dropdown */}
          {showTypeFilter && types.length > 0 && (
            <div className="relative">
              <button
                onClick={() => {
                  const wasOpen = typeDropdownOpen;
                  closeAllDropdowns();
                  setTypeDropdownOpen(!wasOpen);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 border text-sm transition-all duration-200 ${
                  filters.selectedTypes.length > 0
                    ? "border-[#5D0F17] bg-[#5D0F17] text-[#F7F3EA]"
                    : "border-[#5D0F17]/20 hover:border-[#5D0F17]"
                }`}
              >
                {filters.selectedTypes.length > 0
                  ? `Type (${filters.selectedTypes.length})`
                  : "Type"}
                <ChevronDown size={16} />
              </button>
              {typeDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setTypeDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 bg-[#F7F3EA] border border-[#5D0F17]/20 shadow-lg z-20 min-w-[160px] max-h-[300px] overflow-y-auto animate-fade-in">
                    {types.map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleType(type)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#D8CABD]/20 transition flex items-center justify-between ${
                          filters.selectedTypes.includes(type)
                            ? "bg-[#D8CABD]/30 font-medium"
                            : ""
                        }`}
                      >
                        {type}
                        {filters.selectedTypes.includes(type) && (
                          <span className="text-[#5D0F17]">&#10003;</span>
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
              className="flex items-center gap-2 px-4 py-2.5 border border-[#5D0F17]/20 text-sm hover:border-[#5D0F17] transition-all duration-200"
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
                <div className="absolute top-full right-0 mt-1 bg-[#F7F3EA] border border-[#5D0F17]/20 shadow-lg z-20 min-w-[180px] animate-fade-in">
                  {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        updateFilters({ sort: option });
                        setSortDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#D8CABD]/20 transition ${
                        filters.sort === option
                          ? "bg-[#D8CABD]/30 font-medium"
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
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#5D0F17]/10">
            <span className="text-xs uppercase tracking-wide text-[#5D0F17]/50">
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
              <span className="ml-auto text-sm text-[#5D0F17]/60">
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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5D0F17]/40"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-3 border border-[#5D0F17]/20 text-sm focus:border-[#5D0F17] focus:outline-none bg-transparent transition"
          />
        </div>

        {/* Mobile Filter Toggle + Sort */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border text-sm transition ${
              hasActiveFilters
                ? "border-[#5D0F17] bg-[#5D0F17] text-[#F7F3EA]"
                : "border-[#5D0F17]/20"
            }`}
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-[#F7F3EA] text-[#5D0F17] px-1.5 py-0.5 text-xs">
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
            className="flex-1 py-3 px-4 border border-[#5D0F17]/20 text-sm focus:border-[#5D0F17] focus:outline-none bg-[#F7F3EA]"
          >
            {(Object.keys(sortLabels) as SortOption[]).map((option) => (
              <option key={option} value={option}>
                {sortLabels[option]}
              </option>
            ))}
          </select>
        </div>

        {/* Mobile Filter Panel — Accordion */}
        {mobileFiltersOpen && (
          <div className="mt-3 border border-[#5D0F17]/15 bg-[#D8CABD]/10">
            <div className="px-4">
              {/* Price Range */}
              <MobileSection
                id="price"
                label="Price Range"
                activeCount={filters.priceRange !== "all" ? 1 : 0}
              >
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(priceRangeLabels) as PriceRange[]).map((range) => (
                    <button
                      key={range}
                      onClick={() => updateFilters({ priceRange: range })}
                      className={`px-3 py-2 text-sm border transition ${
                        filters.priceRange === range
                          ? "border-[#5D0F17] bg-[#5D0F17] text-[#F7F3EA]"
                          : "border-[#5D0F17]/20 bg-[#F7F3EA] hover:border-[#5D0F17]"
                      }`}
                    >
                      {priceRangeLabels[range]}
                    </button>
                  ))}
                </div>
              </MobileSection>

              {/* Categories */}
              {showCategoryFilter && categories.length > 0 && (
                <MobileSection
                  id="categories"
                  label="Category"
                  activeCount={filters.selectedCategories.length}
                >
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <label key={cat.slug} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.selectedCategories.includes(cat.slug)}
                          onChange={() => toggleCategory(cat.slug)}
                          className="w-4 h-4 border-[#5D0F17]/20 focus:ring-[#5D0F17] accent-[#5D0F17]"
                        />
                        <span className="text-sm">{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </MobileSection>
              )}

              {/* Colors */}
              {showColorFilter && colors.length > 0 && (
                <MobileSection
                  id="colors"
                  label="Color"
                  activeCount={filters.selectedColors.length}
                >
                  <div className="grid grid-cols-2 gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => toggleColor(color)}
                        className={`px-3 py-2 text-sm border transition text-left ${
                          filters.selectedColors.includes(color)
                            ? "border-[#5D0F17] bg-[#5D0F17] text-[#F7F3EA]"
                            : "border-[#5D0F17]/20 bg-[#F7F3EA] hover:border-[#5D0F17]"
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </MobileSection>
              )}

              {/* Brands */}
              {showBrandFilter && brands.length > 0 && (
                <MobileSection
                  id="brands"
                  label="Brand"
                  activeCount={filters.selectedBrands.length}
                >
                  <div className="space-y-2">
                    {brands.map((brand) => (
                      <label key={brand.slug} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.selectedBrands.includes(brand.slug)}
                          onChange={() => toggleBrand(brand.slug)}
                          className="w-4 h-4 border-[#5D0F17]/20 focus:ring-[#5D0F17] accent-[#5D0F17]"
                        />
                        <span className="text-sm">{brand.label}</span>
                      </label>
                    ))}
                  </div>
                </MobileSection>
              )}

              {/* Sizes */}
              {showSizeFilter && sizes.length > 0 && (
                <MobileSection
                  id="sizes"
                  label="Size"
                  activeCount={filters.selectedSizes.length}
                >
                  <div className="space-y-2">
                    {sizes.map((size) => (
                      <label key={size} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.selectedSizes.includes(size)}
                          onChange={() => toggleSize(size)}
                          className="w-4 h-4 border-[#5D0F17]/20 focus:ring-[#5D0F17] accent-[#5D0F17]"
                        />
                        <span className="text-sm">{size}</span>
                      </label>
                    ))}
                  </div>
                </MobileSection>
              )}

              {/* Types */}
              {showTypeFilter && types.length > 0 && (
                <MobileSection
                  id="types"
                  label="Type"
                  activeCount={filters.selectedTypes.length}
                >
                  <div className="space-y-2">
                    {types.map((type) => (
                      <label key={type} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.selectedTypes.includes(type)}
                          onChange={() => toggleType(type)}
                          className="w-4 h-4 border-[#5D0F17]/20 focus:ring-[#5D0F17] accent-[#5D0F17]"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </MobileSection>
              )}

              {/* Stores */}
              {stores.length > 1 && (
                <MobileSection
                  id="stores"
                  label="Store"
                  activeCount={filters.selectedStores.length}
                >
                  <div className="space-y-2">
                    {stores.map((store) => (
                      <label key={store.slug} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.selectedStores.includes(store.slug)}
                          onChange={() => toggleStore(store.slug)}
                          className="w-4 h-4 border-[#5D0F17]/20 focus:ring-[#5D0F17] accent-[#5D0F17]"
                        />
                        <span className="text-sm">{store.name}</span>
                      </label>
                    ))}
                  </div>
                </MobileSection>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-4 py-4 border-t border-[#5D0F17]/10">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex-1 py-2.5 text-sm border border-[#5D0F17]/20 hover:border-[#5D0F17] transition"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 py-2.5 text-sm bg-[#5D0F17] text-[#F7F3EA]"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Results Count (Mobile) */}
        {productCount !== undefined && (
          <p className="mt-3 text-sm text-[#5D0F17]/60">
            {productCount} product{productCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
