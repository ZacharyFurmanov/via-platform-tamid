import { inventory } from "@/app/lib/inventory";
import { categoryMap } from "@/app/lib/categoryMap";
import type { CategorySlug } from "@/app/lib/categoryMap";

type ActiveCategory = {
  slug: CategorySlug;
  label: string;
  image: string;
};

export function getActiveCategories(): ActiveCategory[] {
  // collect unique category slugs that exist in inventory
  const activeSlugs = new Set<CategorySlug>();

  for (const item of inventory) {
    activeSlugs.add(item.category);
  }

  // build display-ready category objects
  return Array.from(activeSlugs).map((slug) => ({
    slug,
    label: categoryMap[slug],
    image: `/categories/${slug}.jpg`, // adjust path if needed
  }));
}
