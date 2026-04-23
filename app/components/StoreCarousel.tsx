"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { stores } from "../lib/stores";
import TrackedStoreLink from "./TrackedStoreLink";

// ~35 stores × 192 px/card ÷ 24 px/s ≈ 280 s per full loop
const DURATION = 280;

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

function getTranslateX(el: HTMLElement): number {
  const t = window.getComputedStyle(el).transform;
  if (!t || t === "none") return 0;
  // matrix(a,b,c,d,tx,ty) — tx is index 4
  const nums = t.match(/matrix\(([^)]+)\)/);
  if (!nums) return 0;
  return parseFloat(nums[1].split(",")[4]) || 0;
}

export default function StoreCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, baseX: 0, lastX: 0 });
  const [animDelay, setAnimDelay] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [hovered, setHovered] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    const track = trackRef.current;
    if (!track) return;
    const currentX = getTranslateX(track);
    drag.current = { active: true, startX: e.touches[0].clientX, baseX: currentX, lastX: currentX };
    setDragX(currentX);
    setDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current.active) return;
    const dx = e.touches[0].clientX - drag.current.startX;
    const newX = drag.current.baseX + dx;
    drag.current.lastX = newX;
    setDragX(newX);
  };

  const onTouchEnd = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    const track = trackRef.current;
    if (!track) { setDragging(false); return; }

    // halfWidth = the distance the animation covers (translateX goes 0 → -halfWidth)
    const halfWidth = track.offsetWidth / 2;
    // Normalize to a position within one cycle
    const raw = Math.abs(drag.current.lastX);
    const normalised = raw % halfWidth;
    const progress = normalised / halfWidth;
    setAnimDelay(-(progress * DURATION));
    setDragging(false);
  };

  const trackStyle: React.CSSProperties = dragging
    ? { width: "max-content", transform: `translateX(${dragX}px)` }
    : {
        width: "max-content",
        animation: `scroll-carousel ${DURATION}s linear infinite`,
        animationDelay: `${animDelay}s`,
        animationPlayState: hovered ? "paused" : "running",
      };

  return (
    <div
      className="overflow-hidden"
      style={{
        maskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        ref={trackRef}
        className="flex gap-4 sm:gap-6 select-none"
        style={trackStyle}
      >
        {/* Two copies for seamless loop */}
        {[...stores, ...stores].map((store, i) => (
          <StoreCard key={`${store.slug}-${i}`} store={store} />
        ))}
      </div>
    </div>
  );
}
