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

  // Capture UTM params (or infer source from referrer) once per session on first load
  useEffect(() => {
    if (utmTracked.current) return;
    if (typeof window === "undefined") return;

    // Check sessionStorage so we only fire once per browser session
    try {
      if (sessionStorage.getItem("via_utm_tracked")) return;
    } catch {}

    const params = new URLSearchParams(window.location.search);
    let utmSource = params.get("utm_source");
    let utmMedium = params.get("utm_medium");
    let utmCampaign = params.get("utm_campaign");
    const utmContent = params.get("utm_content");
    const utmTerm = params.get("utm_term");

    // If no explicit UTM params, try to infer source from the HTTP referrer
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

    utmTracked.current = true;
    try {
      sessionStorage.setItem("via_utm_tracked", "1");
    } catch {}

    const userId = status === "authenticated"
      ? ((session?.user as { id?: string } | undefined)?.id ?? null)
      : null;

    const payload = JSON.stringify({
      utm_source: utmSource,
      utm_medium: utmMedium ?? undefined,
      utm_campaign: utmCampaign ?? undefined,
      utm_content: utmContent ?? undefined,
      utm_term: utmTerm ?? undefined,
      landing_path: window.location.pathname,
      user_id: userId,
    });

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
  // Run once on mount — intentionally no dependencies so it fires exactly once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
