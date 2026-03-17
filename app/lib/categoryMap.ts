// Fine-grained product categories (assigned by inferCategoryFromTitle)
export const categoryMap = {
  tops: "Tops",
  sweaters: "Sweaters",
  "coats-jackets": "Coats & Jackets",
  pants: "Pants",
  jeans: "Jeans",
  dresses: "Dresses",
  skirts: "Skirts",
  shorts: "Shorts",
  jumpsuits: "Jumpsuits",
  "other-clothing": "Clothing",
  bags: "Bags",
  shoes: "Shoes",
  accessories: "Accessories",
} as const;

export type CategorySlug = keyof typeof categoryMap;
export type CategoryLabel = (typeof categoryMap)[CategorySlug];

// Slugs that fall under the "Clothing" display category
export const clothingSlugs = new Set<CategorySlug>([
  "tops", "sweaters", "coats-jackets", "pants", "jeans",
  "dresses", "skirts", "shorts", "jumpsuits", "other-clothing",
]);

// The 4 top-level display categories (homepage, header, nav)
export const displayCategories = [
  { slug: "clothing", label: "Clothing", image: "/categories/clothes.jpg" },
  { slug: "bags", label: "Bags", image: "/categories/bags.jpg" },
  { slug: "shoes", label: "Shoes", image: "/categories/shoes.jpg" },
  { slug: "accessories", label: "Accessories", image: "/categories/accessories.jpg" },
] as const;

export type DisplayCategorySlug = (typeof displayCategories)[number]["slug"];
