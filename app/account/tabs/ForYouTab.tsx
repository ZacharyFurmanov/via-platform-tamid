"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "@/app/components/ProductCard";
import { categoryMap } from "@/app/lib/categoryMap";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
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
  hasFavorites: boolean;
};

export default function ForYouTab({ hasFavorites }: Props) {
  const [recs, setRecs] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasFavorites) { setLoading(false); return; }
    fetch("/api/account/recommendations")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.products)) setRecs(d.products); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasFavorites]);

  if (!hasFavorites) {
    return (
      <div className="text-center py-16">
        <p className="font-serif text-lg mb-1">Nothing here yet</p>
        <p className="text-sm text-[#5D0F17]/50 mb-6">Save some favorites and we&apos;ll find things you&apos;ll love.</p>
        <Link href="/categories" className="inline-block bg-[#5D0F17] text-[#FFFDF8] px-6 py-3 text-xs uppercase tracking-[0.15em] hover:bg-[#5D0F17]/85 transition">
          Browse Products
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-[#5D0F17]/5 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (recs.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-serif text-lg mb-1">No suggestions right now</p>
        <p className="text-sm text-[#5D0F17]/50">Check back as new items are added.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-[#5D0F17]/50">{recs.length} items picked for you</p>
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
  );
}
