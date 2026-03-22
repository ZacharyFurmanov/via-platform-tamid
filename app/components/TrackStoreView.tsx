"use client";

import { useEffect } from "react";
import { trackStoreView } from "@/app/lib/firebase-analytics";

type TrackStoreViewProps = {
  storeSlug: string;
  storeName: string;
  inventoryCount: number;
};

export default function TrackStoreView({
  storeSlug,
  storeName,
  inventoryCount,
}: TrackStoreViewProps) {
  useEffect(() => {
    trackStoreView({
      storeSlug,
      storeName,
      inventoryCount,
    });
  }, [inventoryCount, storeName, storeSlug]);

  return null;
}
