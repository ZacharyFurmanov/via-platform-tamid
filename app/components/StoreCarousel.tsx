"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { stores } from "../lib/stores";
import TrackedStoreLink from "./TrackedStoreLink";

const SPEED = 0.5; // px per animation frame

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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let animId: number;
    let paused = false;
    let resumeTimer: ReturnType<typeof setTimeout>;

    function pause(ms: number) {
      paused = true;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { paused = false; }, ms);
    }

    function tick() {
      if (!paused) {
        el.scrollLeft += SPEED;
        // Seamless loop: when we've scrolled through the first copy, jump back
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      animId = requestAnimationFrame(tick);
    }

    // Pause auto-scroll while the user is actively scrolling, resume after idle
    el.addEventListener("wheel", () => pause(2000), { passive: true });
    el.addEventListener("touchstart", () => pause(5000), { passive: true });
    el.addEventListener("touchend", () => pause(1500), { passive: true });
    // Pause on hover (desktop)
    el.addEventListener("mouseenter", () => pause(60000));
    el.addEventListener("mouseleave", () => pause(300));

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(resumeTimer);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex gap-4 sm:gap-6 overflow-x-scroll scrollbar-hide"
      style={{
        maskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
      }}
    >
      {[...stores, ...stores].map((store, i) => (
        <StoreCard key={`${store.slug}-${i}`} store={store} />
      ))}
    </div>
  );
}
