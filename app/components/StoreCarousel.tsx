"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { stores } from "../lib/stores";

export default function StoreCarousel() {
  const n = stores.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const next = useCallback(() => {
    setActive((i) => (i + 1) % n);
  }, [n]);

  const prev = useCallback(() => {
    setActive((i) => (i - 1 + n) % n);
  }, [n]);

  // Auto-play every 3 seconds, pause on hover
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 3000);
    return () => clearInterval(timer);
  }, [paused, next]);

  // Touch / swipe support
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      dx > 0 ? next() : prev();
    }
  };

  // Get position offset from active card (-2, -1, 0, 1, 2, etc.)
  const getOffset = (idx: number) => {
    let diff = idx - active;
    // Wrap around for seamless looping
    if (diff > n / 2) diff -= n;
    if (diff < -n / 2) diff += n;
    return diff;
  };

  // Style each card based on its offset from center
  const getCardStyle = (offset: number): React.CSSProperties => {
    const absOffset = Math.abs(offset);

    if (absOffset > 2) {
      return { opacity: 0, pointerEvents: "none", transform: "scale(0.6) translateX(0px)", zIndex: 0 };
    }

    // Center card
    if (offset === 0) {
      return {
        opacity: 1,
        zIndex: 30,
        transform: "scale(1) translateX(0px)",
      };
    }

    // Immediate neighbors
    if (absOffset === 1) {
      const tx = offset * 280;
      return {
        opacity: 1,
        zIndex: 20,
        transform: `scale(0.85) translateX(${tx}px)`,
      };
    }

    // Far cards
    const tx = offset * 320;
    return {
      opacity: 0.6,
      zIndex: 10,
      transform: `scale(0.7) translateX(${tx}px)`,
    };
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Coverflow viewport */}
      <div className="relative flex items-center justify-center overflow-hidden"
        style={{ height: "clamp(400px, 55vw, 600px)" }}
      >
        {stores.map((store, i) => {
          const offset = getOffset(i);
          const style = getCardStyle(offset);
          const isCenter = offset === 0;

          return (
            <div
              key={store.slug}
              className="absolute transition-all duration-700 ease-in-out"
              style={{
                width: "clamp(280px, 38vw, 480px)",
                height: "100%",
                ...style,
              }}
            >
              <Link
                href={`/stores/${store.slug}`}
                className="block w-full h-full relative rounded-2xl overflow-hidden group"
                style={{ backgroundColor: store.logoBg || "#ffffff" }}
              >
                {/* Logo centered on background color */}
                <div className="absolute inset-0 flex items-center justify-center p-8 sm:p-12">
                  <Image
                    src={store.logo || store.image}
                    alt={store.name}
                    fill
                    sizes="(min-width: 768px) 38vw, 80vw"
                    className="object-contain p-8 sm:p-12"
                    priority={Math.abs(offset) <= 1}
                  />
                </div>

                {/* Subtle hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition duration-300" />

                {/* Location + View button at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 text-center">
                  <p className={`mb-2 ${
                    isCenter ? "text-sm" : "text-xs"
                  } ${"logoDark" in store && store.logoDark ? "text-white/60" : "text-black/50"}`}>
                    {store.location}
                  </p>
                  {isCenter && (
                    <span className={`inline-block text-xs font-medium px-5 py-2 rounded-full transition ${
                      "logoDark" in store && store.logoDark
                        ? "bg-white text-black hover:bg-white/90"
                        : "bg-black text-white hover:bg-neutral-800"
                    }`}>
                      View Store
                    </span>
                  )}
                </div>
              </Link>
            </div>
          );
        })}

        {/* Left arrow */}
        <button
          onClick={prev}
          aria-label="Previous store"
          className="absolute left-4 sm:left-8 z-40 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition"
        >
          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right arrow */}
        <button
          onClick={next}
          aria-label="Next store"
          className="absolute right-4 sm:right-8 z-40 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition"
        >
          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
