"use client";

import { useEffect } from "react";

export default function ScrollToTop() {
  useEffect(() => {
    // Prevent Next.js from force-scrolling to the top on navigation
    const originalScrollTo = window.scrollTo;
    window.scrollTo = function (...args: any[]) {
      // Block any scrollTo(0, 0) calls (Next.js default behavior)
      if (
        (args.length === 2 && args[0] === 0 && args[1] === 0) ||
        (args.length === 1 &&
          typeof args[0] === "object" &&
          args[0]?.top === 0 &&
          (args[0]?.left === 0 || args[0]?.left === undefined))
      ) {
        return;
      }
      return originalScrollTo.apply(window, args);
    };

    return () => {
      window.scrollTo = originalScrollTo;
    };
  }, []);

  return null;
}
