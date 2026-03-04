"use client";

import { useEffect } from "react";

/**
 * Fires a fire-and-forget POST to record a product page view.
 * Used by the product detail page to track impressions for popularity ranking.
 */
export default function TrackProductView({ productId }: { productId: string }) {
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    }).catch(() => {});
  }, [productId]);

  return null;
}
