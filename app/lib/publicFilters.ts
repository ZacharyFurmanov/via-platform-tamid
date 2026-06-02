// Shared filter logic for /api/public/* product list endpoints.

export type PublicFilters = {
 sizes: string[];      // e.g. ["S", "M", "38"]
 categories: string[]; // e.g. ["clothing", "shoes"]
 stores: string[];     // store slugs
 priceMin: number | null;
 priceMax: number | null;
 sort: "newest" | "priceAsc" | "priceDesc";
};

export function parseFilters(searchParams: URLSearchParams): PublicFilters {
 const csv = (key: string) =>
 (searchParams.get(key) ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

 const num = (key: string) => {
 const v = searchParams.get(key);
 if (!v) return null;
 const n = parseFloat(v);
 return Number.isFinite(n) ? n : null;
 };

 const rawSort = searchParams.get("sort") ?? "newest";
 const sort: PublicFilters["sort"] =
 rawSort === "priceAsc" || rawSort === "priceDesc" ? rawSort : "newest";

 return {
 sizes: csv("sizes"),
 categories: csv("categories"),
 stores: csv("stores"),
 priceMin: num("priceMin"),
 priceMax: num("priceMax"),
 sort,
 };
}

// Category → title keyword patterns (case-insensitive).
// Mirrors the spirit of inferCategoryFromTitle but works as SQL ILIKE OR groups.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
 clothing: [
 "dress", "top", "shirt", "blouse", "skirt", "pants", "jeans", "trousers",
 "jacket", "coat", "sweater", "cardigan", "vest", "jumpsuit", "romper",
 "blazer", "hoodie", "tee", "t-shirt", "tshirt", "polo", "tank", "shorts",
 "leggings", "set", "suit",
 ],
 bags: [
 "bag", "purse", "clutch", "tote", "backpack", "pouch", "handbag",
 "satchel", "hobo", "duffle", "wallet",
 ],
 shoes: [
 "shoe", "boot", "heel", "sandal", "sneaker", "mule", "loafer", "flat",
 "pump", "slingback", "espadrille", "wedge", "oxford", "stiletto",
 "trainer", "slipper", "clog",
 ],
 accessories: [
 "belt", "scarf", "hat", "jewelry", "earring", "necklace", "bracelet",
 "ring", "sunglasses", "glasses", "tie", "watch", "headband",
 ],
 home: [
 "vase", "lamp", "mug", "cup", "bowl", "plate", "tray", "candle",
 "pillow", "blanket", "throw", "frame", "art print",
 ],
};

export function categoryClauseSql(categories: string[]): {
 sql: string;
 params: string[];
} | null {
 if (categories.length === 0) return null;
 const keywords = categories.flatMap((c) => CATEGORY_KEYWORDS[c] ?? []);
 if (keywords.length === 0) return null;
 const params = keywords.map((kw) => `%${kw}%`);
 const placeholders = params.map((_, i) => `$${i + 1}`).join(" OR title ILIKE ");
 return {
 sql: `(title ILIKE ${placeholders})`,
 params,
 };
}

// Returns the keyword list for a set of categories — used when we do JS-side
// post-filtering (because neon serverless doesn't easily support dynamic OR lists).
export function categoryKeywords(categories: string[]): string[] {
 return categories.flatMap((c) => CATEGORY_KEYWORDS[c] ?? []);
}

// Applies in-memory filtering for fields that are hard to express in SQL with
// neon's tagged-template API (categories, size-list).
export function applyJsFilters<T extends { name: string }>(
 products: T[],
 filters: PublicFilters,
): T[] {
 let out = products;

 if (filters.categories.length > 0) {
 const kws = categoryKeywords(filters.categories);
 if (kws.length > 0) {
 const lowerKws = kws.map((k) => k.toLowerCase());
 out = out.filter((p) => {
  const t = p.name.toLowerCase();
  return lowerKws.some((kw) => t.includes(kw));
 });
 }
 }

 return out;
}
