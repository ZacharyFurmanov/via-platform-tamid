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

  useEffect(() => {
    if (pathname === prevPathname.current) return;

    const prev = prevPathname.current;
    prevPathname.current = pathname;

    // Save scroll position when leaving a browsable page
    if (isBrowsable(prev)) {
      savedScrollPositions.current[prev] = window.scrollY;
    }

    // Restore scroll position if returning to a browsable page
    if (isBrowsable(pathname) && savedScrollPositions.current[pathname] != null) {
      const saved = savedScrollPositions.current[pathname];
      // Use requestAnimationFrame to let the page render first
      requestAnimationFrame(() => {
        window.scrollTo(0, saved);
      });
    } else if (!isBrowsable(pathname)) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
