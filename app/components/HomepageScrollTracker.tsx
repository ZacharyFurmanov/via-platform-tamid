"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

// Sections in top-to-bottom order. Labels must match data-section attributes on page.tsx.
const SECTIONS = [
  "hero",
  "how-it-works",
  "favorites",
  "collections",
  "stores",
  "new-arrivals",
  "categories",
] as const;

export default function HomepageScrollTracker() {
  const { data: session } = useSession();
  const seen = useRef(new Set<string>());
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const section of SECTIONS) {
      const el = document.querySelector(`[data-section="${section}"]`);
      if (!el) continue;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !seen.current.has(section)) {
            seen.current.add(section);
            const payload = JSON.stringify({ section, userId });
            if (navigator.sendBeacon) {
              navigator.sendBeacon(
                "/api/track-homepage-section",
                new Blob([payload], { type: "application/json" })
              );
            } else {
              fetch("/api/track-homepage-section", {
                method: "POST",
                body: payload,
                headers: { "Content-Type": "application/json" },
                keepalive: true,
              }).catch(() => {});
            }
          }
        },
        { threshold: 0.25 } // fires when 25% of the section is visible
      );

      observer.observe(el);
      observers.push(observer);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [userId]);

  return null;
}
