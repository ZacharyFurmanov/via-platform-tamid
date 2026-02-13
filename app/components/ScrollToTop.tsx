"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const PRESERVE_SCROLL_PREFIXES = ["/stores/", "/categories/", "/browse"];

export default function ScrollToTop() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    const shouldPreserve = PRESERVE_SCROLL_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    );

    if (!shouldPreserve) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
