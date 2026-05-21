"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { stores } from "../lib/stores";
import TrackedStoreLink from "./TrackedStoreLink";

// Auto-scroll speed in px per animation frame (~60fps) — 1.5px ≈ 90px/s
const SPEED = 1.5;

function StoreCard({ store }: { store: (typeof stores)[number] }) {
  return (
    <TrackedStoreLink
      href={`/stores/${store.slug}`}
      storeSlug={store.slug}
      storeName={store.name}
      surface="home_store_carousel"
      className="group block flex-shrink-0 w-44 sm:w-64"
    >
      <div
        className="aspect-[3/4] relative overflow-hidden w-full"
        style={{ backgroundColor: "#FFFDF8" }}
      >
        {store.image.includes("placeholder") ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/vya-logo.png"
              alt="VYA"
              className="w-12 sm:w-16 blur-[1px] opacity-40 select-none pointer-events-none"
            />
            <p className="text-[7px] uppercase tracking-[0.3em] text-[#5D0F17]/40">
              Coming Soon
            </p>
          </div>
        ) : (
          <Image
            src={store.image}
            alt={store.name}
            fill
            sizes="(min-width: 640px) 256px, 176px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
        )}
      </div>
      <div className="pt-2 pb-1">
        <p className="text-[9px] uppercase tracking-wide text-[#5D0F17]/70 mb-0.5 truncate">
          {store.location}
        </p>
        <h3 className="font-serif text-xs sm:text-sm text-[#5D0F17] leading-snug line-clamp-2">
          {store.name}
        </h3>
      </div>
    </TrackedStoreLink>
  );
}

export default function StoreCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Auto-scroll tick — scrolls forward and loops seamlessly at the halfway point
    const tick = () => {
      if (!pausedRef.current) {
        el.scrollLeft += SPEED;
        const half = el.scrollWidth / 2;
        if (half > 0 && el.scrollLeft >= half) {
          el.scrollLeft -= half;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    // Desktop: drag to scroll
    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      pausedRef.current = true;
      dragStartX.current = e.clientX;
      dragScrollLeft.current = el.scrollLeft;
      el.style.cursor = "grabbing";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      el.scrollLeft = dragScrollLeft.current + (dragStartX.current - e.clientX);
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      el.style.cursor = "grab";
      setTimeout(() => { pausedRef.current = false; }, 600);
    };

    // Desktop: pause auto-scroll on hover so users can read
    const onMouseEnter = () => { if (!isDragging.current) pausedRef.current = true; };
    const onMouseLeave = () => { if (!isDragging.current) pausedRef.current = false; };

    // Mobile: browser handles native touch scroll — just pause auto-scroll during it
    const onTouchStart = () => { pausedRef.current = true; };
    const onTouchEnd = () => {
      setTimeout(() => {
        // Correct position if momentum carried past the halfway loop point
        const half = el.scrollWidth / 2;
        if (half > 0 && el.scrollLeft >= half) el.scrollLeft -= half;
        pausedRef.current = false;
      }, 900);
    };

    el.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mouseenter", onMouseEnter);
    el.addEventListener("mouseleave", onMouseLeave);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      el.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mouseenter", onMouseEnter);
      el.removeEventListener("mouseleave", onMouseLeave);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <div
      ref={scrollRef}
      className="flex gap-4 sm:gap-6 overflow-x-scroll cursor-grab select-none"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        maskImage:
          "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
      }}
    >
      {[...stores, ...stores].map((store, i) => (
        <StoreCard key={`${store.slug}-${i}`} store={store} />
      ))}
    </div>
  );
}
