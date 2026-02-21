export const categories = [
    { slug: "tops", label: "Tops", image: "/categories/clothes.jpg" },
    { slug: "sweaters", label: "Sweaters", image: "/categories/clothes.jpg" },
    { slug: "coats-jackets", label: "Coats & Jackets", image: "/categories/clothes.jpg" },
    { slug: "pants", label: "Pants", image: "/categories/clothes.jpg" },
    { slug: "jeans", label: "Jeans", image: "/categories/clothes.jpg" },
    { slug: "dresses", label: "Dresses", image: "/categories/clothes.jpg" },
    { slug: "skirts", label: "Skirts", image: "/categories/clothes.jpg" },
    { slug: "shorts", label: "Shorts", image: "/categories/clothes.jpg" },
    { slug: "jumpsuits", label: "Jumpsuits", image: "/categories/clothes.jpg" },
    { slug: "other-clothing", label: "Clothing", image: "/categories/clothes.jpg" },
    { slug: "bags", label: "Bags", image: "/categories/bags.jpg" },
    { slug: "shoes", label: "Shoes", image: "/categories/shoes.jpg" },
    { slug: "accessories", label: "Accessories", image: "/categories/accessories.jpg" },
  ] as const;

  export type CategorySlug = typeof categories[number]["slug"];
