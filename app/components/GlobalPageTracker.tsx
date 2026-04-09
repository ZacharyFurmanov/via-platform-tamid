"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

function inferPageType(pathname: string): string {
  if (pathname === "/") return "homepage";
  if (pathname.startsWith("/stores/")) return "store";
  if (pathname.startsWith("/categories/")) return "category";
  if (pathname.startsWith("/products/")) return "product";
  if (pathname.startsWith("/browse")) return "browse";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/new-arrivals")) return "new-arrivals";
  if (pathname.startsWith("/brands")) return "brands";
  if (pathname.startsWith("/collections/")) return "collection";
  if (pathname.startsWith("/account")) return "account";
  return "other";
}

export default function GlobalPageTracker() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    // Wait until session has resolved — never fire with a null user_id
    if (status !== "authenticated") return;
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    if (!userId) return;

    // Don't track admin activity — it would inflate WAU/MAU metrics
    if (pathname.startsWith("/admin")) return;

    const pageType = inferPageType(pathname);
    const segments = pathname.split("/");
    const pageSlug = segments[2] ?? null;

    const payload = JSON.stringify({ pageType, pageSlug, userId });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track-page", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/track-page", {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  // pathname changes on every navigation; status/session fire once when auth resolves
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, status]);

  return null;
}
