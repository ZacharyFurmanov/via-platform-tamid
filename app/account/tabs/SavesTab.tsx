"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProductCard from "@/app/components/ProductCard";
import { categoryMap } from "@/app/lib/categoryMap";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import type { FavoriteProductEntry } from "@/app/lib/favorites-db";
import { formatPrice } from "@/app/lib/formatPrice";

type RecommendedProduct = {
  id: number;
  store_slug: string;
  store_name: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  images: string | null;
  external_url: string | null;
  size: string | null;
  fav_count: number;
};

type Props = {
  userId: string;
  favProducts: FavoriteProductEntry[];
};

export default function SavesTab({ userId: _userId, favProducts }: Props) {
  const [recs, setRecs] = useState<RecommendedProduct[]>([]);
  const [recsLoaded, setRecsLoaded] = useState(false);

  useEffect(() => {
    if (favProducts.length === 0) return;
    fetch("/api/account/recommendations")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.products)) setRecs(d.products); })
      .catch(() => {})
      .finally(() => setRecsLoaded(true));
  }, [favProducts.length]);

  if (favProducts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 mx-auto mb-4 border border-[#5D0F17]/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-[#5D0F17]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <p className="font-serif text-lg mb-1">No favorites yet</p>
        <p className="text-sm text-[#5D0F17]/50 mb-6">Tap the heart on any product to save it here.</p>
        <Link href="/categories" className="inline-block bg-[#5D0F17] text-[#F7F3EA] px-6 py-3 text-xs uppercase tracking-[0.15em] hover:bg-[#5D0F17]/85 transition">
          Browse Products
        </Link>
      </div>
    );
  }

  const displayed = favProducts.slice(0, 48);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-[#5D0F17]/50">{favProducts.length} saved</p>
        <Link href="/account/favorites" className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 hover:text-[#5D0F17] transition">
          View All
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {displayed.map((entry) => {
          const product = entry.product;
          const snap = entry.snapshot;
          const productId = entry.productId;

          const title = product?.title ?? snap?.title ?? "Unknown";
          const storeSlug = product?.store_slug ?? snap?.store_slug ?? "unknown";
          const storeName = product?.store_name ?? snap?.store_name ?? "";
          const price = product?.price ?? snap?.price ?? 0;
          const image = product?.image ?? snap?.image ?? "";
          const size = product?.size ?? snap?.size ?? null;
          const compositeId = `${storeSlug}-${productId}`;

          let images: string[] = [];
          const rawImages = product?.images ?? snap?.images;
          if (rawImages) {
            try {
              const parsed = JSON.parse(rawImages);
              if (Array.isArray(parsed)) images = parsed;
            } catch {}
          }
          if (images.length === 0 && image) images = [image];

          const categorySlug = inferCategoryFromTitle(title);
          const categoryLabel = categoryMap[categorySlug];

          return (
            <ProductCard
              key={productId}
              id={compositeId}
              dbId={productId}
              name={title}
              price={formatPrice(Number(price), product?.currency)}
              category={categoryLabel}
              storeName={storeName}
              storeSlug={storeSlug}
              image={image}
              images={images}
              size={size}
              soldOut={entry.soldOut}
              from="/account"
            />
          );
        })}
      </div>
      {favProducts.length > 20 && (
        <div className="text-center mt-6">
          <Link href="/account/favorites" className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 hover:text-[#5D0F17] transition">
            View all {favProducts.length} favorites →
          </Link>
        </div>
      )}

      {/* You might also like */}
      {recsLoaded && recs.length > 0 && (
        <div className="mt-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-lg text-[#5D0F17]">You might also like</h2>
            <p className="text-xs text-[#5D0F17]/40">{recs.length} items</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {recs.map((p) => {
              let images: string[] = [];
              if (p.images) {
                try {
                  const parsed = JSON.parse(p.images);
                  if (Array.isArray(parsed)) images = parsed;
                } catch {}
              }
              if (images.length === 0 && p.image) images = [p.image];

              const categorySlug = inferCategoryFromTitle(p.title);
              const categoryLabel = categoryMap[categorySlug];

              return (
                <ProductCard
                  key={p.id}
                  id={`${p.store_slug}-${p.id}`}
                  dbId={p.id}
                  name={p.title}
                  price={formatPrice(Number(p.price), p.currency)}
                  category={categoryLabel}
                  storeName={p.store_name}
                  storeSlug={p.store_slug}
                  image={p.image}
                  images={images}
                  size={p.size}
                  from="/account"
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
