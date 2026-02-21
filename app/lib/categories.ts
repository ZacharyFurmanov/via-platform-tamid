import { categoryMap, type CategorySlug, clothingSlugs, displayCategories } from "./categoryMap";

// All fine-grained categories (used for filtering within clothing page, etc.)
const categoryImages: Partial<Record<CategorySlug, string>> = {
  bags: "/categories/bags.jpg",
  shoes: "/categories/shoes.jpg",
  accessories: "/categories/accessories.jpg",
};

const defaultImage = "/categories/clothes.jpg";

export const categories = (Object.keys(categoryMap) as CategorySlug[]).map((slug) => ({
  slug,
  label: categoryMap[slug],
  image: categoryImages[slug] ?? defaultImage,
}));

// Clothing subcategories only (for filters on the clothing page)
export const clothingSubcategories = categories.filter((c) =>
  clothingSlugs.has(c.slug as CategorySlug)
);

export { displayCategories, clothingSlugs };
export type { CategorySlug };
