"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { stores } from "../lib/stores";

export default function StoreCarousel() {
  const n = stores.length;
  // Triple the array so we can loop seamlessly in both directions
  const extended = [...stores, ...stores, ...stores];
  const total = extended.length;

  const [index, setIndex] = useState(n); // start at the middle copy
  const [animating, setAnimating] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // After the CSS transition ends, snap back to the middle copy if needed
  const handleTransitionEnd = useCallback(
    (e: React.TransitionEvent) => {
      if (e.target !== trackRef.current) return;
      setAnimating(false);
      setIndex((i) => {
        if (i >= n * 2) return i - n;
        if (i < n) return i + n;
        return i;
      });
    },
    [n]
  );

  const next = useCallback(() => {
    if (animating) return;
    setAnimating(true);
    setIndex((i) => i + 1);
  }, [animating]);

  const prev = useCallback(() => {
    if (animating) return;
    setAnimating(true);
    setIndex((i) => i - 1);
  }, [animating]);

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

  // translateX is a percentage of the track's own width.
  // Each card is 1/total of the track, so shifting by (1/total)*100% moves one card.
  const translatePercent = (index / total) * 100;

  return (
    <div className="relative">
      {/* Carousel viewport */}
      <div
        className="overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          ref={trackRef}
          className={`flex ${animating ? "transition-transform duration-500 ease-in-out" : ""}`}
          style={{ transform: `translateX(-${translatePercent}%)` }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extended.map((store, i) => (
            <div
              key={`${store.slug}-${i}`}
              className="flex-shrink-0 w-full md:w-1/3"
            >
              <div className="px-6">
                <Link href={`/stores/${store.slug}`} className="group block">
                  <div className="aspect-[4/5] relative overflow-hidden mb-3 sm:mb-4 rounded-sm">
                    <Image
                      src={store.image}
                      alt={store.name}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-serif text-black">
                    {store.name}
                  </h3>
                  <p className="text-sm text-gray-600">{store.location}</p>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows + indicators */}
      <div className="flex items-center gap-4 mt-6 px-6">
        <button
          onClick={prev}
          aria-label="Previous store"
          className="text-black/40 hover:text-black transition text-sm"
        >
          &larr;
        </button>
        <div className="flex gap-2">
          {stores.map((_, i) => (
            <span
              key={i}
              className={`h-[2px] transition-all duration-500 ${
                index % n === i
                  ? "w-8 bg-black"
                  : "w-4 bg-black/20"
              }`}
            />
          ))}
        </div>
        <button
          onClick={next}
          aria-label="Next store"
          className="text-black/40 hover:text-black transition text-sm"
        >
          &rarr;
        </button>
      </div>
    </div>
  );
}
