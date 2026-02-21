import { categoryMap, type CategorySlug } from "./categoryMap";

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

export type { CategorySlug };
