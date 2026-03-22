"use client";

import { useEffect } from "react";
import { trackViewItem } from "@/app/lib/firebase-analytics";

/**
 * Fires a fire-and-forget POST to record a product page view.
 * Used by the product detail page to track impressions for popularity ranking.
 */
type TrackProductViewProps = {
  productId: string;
  title: string;
  price: number | string;
  category?: string;
  storeName: string;
  storeSlug: string;
  size?: string | null;
};

export default function TrackProductView({
  productId,
  title,
  price,
  category,
  storeName,
  storeSlug,
  size,
}: TrackProductViewProps) {
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    }).catch(() => {});

    trackViewItem(
      {
        itemId: productId,
        itemName: title,
        price,
        category,
        storeName,
        storeSlug,
        size: size ?? undefined,
      },
      "product_detail"
    );
  }, [category, price, productId, size, storeName, storeSlug, title]);

  return null;
}
