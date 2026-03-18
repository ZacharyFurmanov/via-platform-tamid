"use client";

import ProductCard from "./ProductCard";

type Pick = {
  pickId: number;
  product: {
    id: number;
    title: string;
    price: string | number;
    image: string;
    images: string;
    storeSlug: string;
    storeName: string;
    size?: string | null;
    categoryLabel: string;
    compositeId: string;
  };
};

export default function EditorsPicksScroller({ picks }: { picks: Pick[] }) {
  return (
    <div
      className="overflow-x-auto scrollbar-hide flex gap-3 sm:gap-4 px-6 [&_img]:select-none [&_img]:pointer-events-none"
    >
      {picks.map((pick) => {
        const images: string[] = pick.product.images
          ? (() => { try { return JSON.parse(pick.product.images); } catch { return []; } })()
          : [];

        return (
          <div
            key={pick.pickId}
            className="w-[44vw] sm:w-56 md:w-60 flex-shrink-0"
          >
            <ProductCard
              id={pick.product.compositeId}
              dbId={pick.product.id}
              name={pick.product.title}
              price={`$${Math.round(Number(pick.product.price))}`}
              category={pick.product.categoryLabel as import("@/app/lib/categoryMap").CategoryLabel}
              storeName={pick.product.storeName}
              storeSlug={pick.product.storeSlug}
              image={pick.product.image || ""}
              images={images}
              size={pick.product.size ?? undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
