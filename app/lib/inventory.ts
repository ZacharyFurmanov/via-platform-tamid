import leiVintage from "@/app/data/lei-vintage.json";
import { categoryMap } from "./categoryMap";
import type { CategorySlug } from "./categoryMap";

export type InventoryItem = {
  id: string;
  title: string;
  category: CategorySlug;
  price: number;
  image: string;
  store: string;
};

const inferCategoryFromTitle = (title: string): CategorySlug | null => {
  const t = title.toLowerCase();

  if (t.includes("heel") || t.includes("shoe") || t.includes("boot")) {
    return "shoes";
  }

  if (
    t.includes("bag") ||
    t.includes("clutch") ||
    t.includes("tote") ||
    t.includes("purse")
  ) {
    return "bags";
  }

  if (
    t.includes("jacket") ||
    t.includes("coat") ||
    t.includes("top") ||
    t.includes("blouse") ||
    t.includes("shirt")
  ) {
    return "clothes";
  }

  if (
    t.includes("belt") ||
    t.includes("scarf") ||
    t.includes("hat") ||
    t.includes("accessory")
  ) {
    return "accessories";
  }

  return null;
};

export const inventory: InventoryItem[] = (leiVintage as any[])
  .map((item, idx) => {
    if (!item.title) return null;

    const category = inferCategoryFromTitle(item.title);

    if (!category) {
      console.warn("❌ Could not infer category:", item.title);
      return null;
    }

    return {
      id: `lei-${idx}`,
      title: item.title,
      category,
      price: Number(item.price),
      image: item.image ?? "/placeholder.jpg",
      store: item.store ?? "LEI Vintage",
    };
  })
  .filter(Boolean) as InventoryItem[];
