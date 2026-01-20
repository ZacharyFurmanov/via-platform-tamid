import leiVintageProducts from "@/app/data/lei-vintage.json";
import type { StoreProduct } from "./types";
import type { CategorySlug } from "@/app/lib/categoryMap";
import { products as staticProducts } from "@/app/stores/productData";

export function loadStoreProducts(storeSlug: string): StoreProduct[] {
  // ================= LEI (external Squarespace data) =================
  if (storeSlug === "lei-vintage") {
    return (leiVintageProducts as any[]).map(
      (p, idx): StoreProduct => ({
        id: `lei-${idx}`,
        name: p.title,
        price: `$${p.price}`,
        category: "clothes" as CategorySlug, // ✅ valid CategorySlug
        storeSlug: "lei-vintage",
        externalUrl: p.productUrl ?? "",
        image: p.image,
      })
    );
  }

  // ================= ALL OTHER STORES (internal data) =================
  return staticProducts
    .filter((p) => p.storeSlug === storeSlug)
    .map((p) => ({
      ...p,
      category: p.category as CategorySlug, // ensure category is a valid CategorySlug
    }));
}
