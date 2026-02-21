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
