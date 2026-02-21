import { displayCategories } from "@/app/lib/categoryMap";
import type { DisplayCategorySlug } from "@/app/lib/categoryMap";

type ActiveCategory = {
  slug: DisplayCategorySlug;
  label: string;
  image: string;
};

export async function getActiveCategories(): Promise<ActiveCategory[]> {
  return displayCategories.map((c) => ({ ...c }));
}
