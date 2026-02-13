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
  const restoreTimeouts = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (pathname === prevPathname.current) return;

    // Clear any pending scroll restorations from previous navigation
    restoreTimeouts.current.forEach(clearTimeout);
    restoreTimeouts.current = [];

    const prev = prevPathname.current;
    prevPathname.current = pathname;

    // Save scroll position when leaving a browsable page
    if (isBrowsable(prev)) {
      savedScrollPositions.current[prev] = window.scrollY;
    }

    // Restore scroll position if returning to a browsable page
    if (isBrowsable(pathname) && savedScrollPositions.current[pathname] != null) {
      const saved = savedScrollPositions.current[pathname];
      // Retry at increasing intervals to beat Next.js scroll-to-top
      // and wait for streamed content to load
      const delays = [0, 50, 100, 200, 400, 800];
      restoreTimeouts.current = delays.map((delay) =>
        setTimeout(() => window.scrollTo(0, saved), delay)
      );
    } else if (!isBrowsable(pathname)) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
