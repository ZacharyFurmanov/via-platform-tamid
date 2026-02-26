"use client";

import type { CategoryLabel } from "@/app/lib/categoryMap";
import ProductCard from "./ProductCard";

type GridProduct = {
  id: number;
  store_slug: string;
  store_name: string;
  title: string;
  price: number;
  image: string | null;
  images: string | null;
  categoryLabel: CategoryLabel;
  from?: string;
  size?: string | null;
};

// Every 5th item (index 0, 5, 10…) spans 2 columns for visual variety
function isFeature(index: number): boolean {
  return index % 5 === 0;
}

export default function MixedProductGrid({
  products,
  from,
}: {
  products: GridProduct[];
  from?: string;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
      {products.map((product, i) => {
        const compositeId = `${product.store_slug}-${product.id}`;
        const images: string[] = product.images
          ? JSON.parse(product.images)
          : [];
        const featured = isFeature(i);

        return (
          <div
            key={product.id}
            className={featured ? "col-span-2 md:col-span-1" : "col-span-1"}
          >
            <ProductCard
              id={compositeId}
              dbId={product.id}
              name={product.title}
              price={`$${Math.round(Number(product.price))}`}
              category={product.categoryLabel}
              storeName={product.store_name}
              storeSlug={product.store_slug}
              image={product.image || ""}
              images={images}
              size={product.size}
              from={from}
            />
          </div>
        );
      })}
    </div>
  );
}
