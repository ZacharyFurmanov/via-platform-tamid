"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const BROWSABLE_PREFIXES = ["/stores/", "/categories/", "/browse"];

function isBrowsable(path: string) {
  return BROWSABLE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export default function ScrollToTop() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const savedScrollPositions = useRef<Record<string, number>>({});
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (pathname === prevPathname.current) return;

    // Clean up any previous scroll restoration
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const prev = prevPathname.current;
    prevPathname.current = pathname;

    // Save scroll position when leaving a browsable page
    if (isBrowsable(prev)) {
      savedScrollPositions.current[prev] = window.scrollY;
    }

    // Restore scroll position if returning to a browsable page
    if (isBrowsable(pathname) && savedScrollPositions.current[pathname] != null) {
      const saved = savedScrollPositions.current[pathname];

      // Watch for DOM changes as content streams in, keep scrolling
      // until the page is tall enough and we've reached the target
      const observer = new MutationObserver(() => {
        if (document.documentElement.scrollHeight > saved + window.innerHeight) {
          window.scrollTo(0, saved);
          observer.disconnect();
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      // Also try immediately in case content is already cached
      window.scrollTo(0, saved);

      // Safety: stop observing after 10 seconds
      const timeout = setTimeout(() => {
        observer.disconnect();
      }, 10000);

      cleanupRef.current = () => {
        observer.disconnect();
        clearTimeout(timeout);
      };
    } else if (!isBrowsable(pathname)) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
