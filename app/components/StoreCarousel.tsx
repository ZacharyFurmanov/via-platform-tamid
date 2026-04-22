"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { stores } from "../lib/stores";
import TrackedStoreLink from "./TrackedStoreLink";

const SPEED = 0.4; // px per frame (~24px/s at 60fps — slow drift)

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
  const rafRef = useRef<number | undefined>(undefined);
  const pausedRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Mouse-drag state
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0 });

  const pause = () => {
    pausedRef.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  };

  const resume = (delay = 1200) => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      pausedRef.current = false;
    }, delay);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function tick() {
      if (el && !pausedRef.current) {
        el.scrollLeft += SPEED;
        // Seamless loop: when we've scrolled exactly half the track, reset to 0
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft -= el.scrollWidth / 2;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  // Mouse drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = { active: true, startX: e.pageX, startScroll: el.scrollLeft };
    pause();
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.pageX - dragRef.current.startX;
    el.scrollLeft = dragRef.current.startScroll - dx;
  };

  const onMouseUp = () => {
    dragRef.current.active = false;
    resume(1200);
  };

  return (
    <div
      ref={scrollRef}
      onMouseEnter={pause}
      onMouseLeave={() => { dragRef.current.active = false; resume(800); }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onTouchStart={pause}
      onTouchEnd={() => resume(1500)}
      className="overflow-x-scroll scrollbar-hide flex gap-4 sm:gap-6 cursor-grab active:cursor-grabbing select-none"
      style={{
        scrollBehavior: "auto",
        maskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
      }}
    >
      {/* Two copies for seamless loop */}
      {[...stores, ...stores].map((store, i) => (
        <StoreCard key={`${store.slug}-${i}`} store={store} />
      ))}
    </div>
  );
}
