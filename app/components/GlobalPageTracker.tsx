"use client";

import { useEffect, useRef } from "react";
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
  const utmTracked = useRef(false);

  // Step 1: Capture UTM/referrer data into sessionStorage on first page load.
  // We don't send it yet because the session hasn't resolved — user_id would be null.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem("via_utm_data")) return; // already captured this session
    } catch {}

    const params = new URLSearchParams(window.location.search);
    let utmSource = params.get("utm_source");
    let utmMedium = params.get("utm_medium");
    let utmCampaign = params.get("utm_campaign");
    const utmContent = params.get("utm_content");
    const utmTerm = params.get("utm_term");

    if (!utmSource) {
      const ref = document.referrer;
      if (ref) {
        try {
          const refHost = new URL(ref).hostname.replace(/^www\./, "");
          const REFERRER_MAP: Record<string, string> = {
            "instagram.com": "instagram",
            "l.instagram.com": "instagram",
            "tiktok.com": "tiktok",
            "vm.tiktok.com": "tiktok",
            "t.co": "twitter",
            "twitter.com": "twitter",
            "x.com": "twitter",
            "facebook.com": "facebook",
            "m.facebook.com": "facebook",
            "l.facebook.com": "facebook",
            "fb.com": "facebook",
            "linkedin.com": "linkedin",
            "lnkd.in": "linkedin",
            "threads.net": "threads",
            "pinterest.com": "pinterest",
            "pin.it": "pinterest",
            "youtube.com": "youtube",
            "youtu.be": "youtube",
            "substack.com": "substack",
            "reddit.com": "reddit",
          };
          const inferred = REFERRER_MAP[refHost];
          if (inferred) {
            utmSource = inferred;
            utmMedium = utmMedium ?? "social";
            utmCampaign = utmCampaign ?? "organic";
          }
        } catch {}
      }
    }

    if (!utmSource) return;

    try {
      sessionStorage.setItem("via_utm_data", JSON.stringify({
        utm_source: utmSource,
        utm_medium: utmMedium ?? null,
        utm_campaign: utmCampaign ?? null,
        utm_content: utmContent ?? null,
        utm_term: utmTerm ?? null,
        landing_path: window.location.pathname,
      }));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 2: Once auth resolves, send the stored UTM data with the real user_id.
  // This fires when status changes from "loading" → "authenticated"/"unauthenticated".
  useEffect(() => {
    if (status === "loading") return;
    if (utmTracked.current) return;

    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem("via_utm_data");
    } catch {}
    if (!stored) return;

    // Only send once with a user_id — if unauthenticated, skip (no way to attribute)
    const userId = status === "authenticated"
      ? ((session?.user as { id?: string } | undefined)?.id ?? null)
      : null;
    if (!userId) return;

    utmTracked.current = true;
    try {
      sessionStorage.removeItem("via_utm_data");
    } catch {}

    let data: Record<string, string | null> = {};
    try { data = JSON.parse(stored); } catch {}

    const payload = JSON.stringify({ ...data, user_id: userId });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track-utm", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/track-utm", {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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
