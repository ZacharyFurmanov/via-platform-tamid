"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Props = {
  pageType: "homepage" | "browse" | "category" | "store" | "product" | "new-arrivals" | "brands";
  pageSlug?: string;
};

export default function PageTracker({ pageType, pageSlug }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    // Fire-and-forget — don't block the UI
    const payload = JSON.stringify({ pageType, pageSlug: pageSlug ?? null });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track-page", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/track-page", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
