"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Saves scroll position before link clicks and restores it when the user
 * navigates back (via browser back button / popstate).
 */
export default function ScrollRestorer() {
  const pathname = usePathname();
  const lastPathname = useRef(pathname);
  const shouldRestore = useRef(false);

  // Mark back/forward navigation before Next.js re-renders
  useEffect(() => {
    const onPopState = () => { shouldRestore.current = true; };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Save scroll position when clicking any internal link
  useEffect(() => {
    const onLinkClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a");
      if (!link?.href) return;
      try {
        const url = new URL(link.href);
        if (url.origin !== window.location.origin) return;
      } catch { return; }
      sessionStorage.setItem(`scrollY:${pathname}`, String(window.scrollY));
    };
    document.addEventListener("click", onLinkClick, true);
    return () => document.removeEventListener("click", onLinkClick, true);
  }, [pathname]);

  // Restore scroll after path changes (back navigation only)
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;

    if (shouldRestore.current) {
      shouldRestore.current = false;
      const saved = sessionStorage.getItem(`scrollY:${pathname}`);
      if (saved) {
        const y = Number(saved);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          window.scrollTo(0, y);
        }));
      }
    }
  }, [pathname]);

  return null;
}
