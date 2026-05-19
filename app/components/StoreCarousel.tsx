"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { stores } from "../lib/stores";
import TrackedStoreLink from "./TrackedStoreLink";

// Duration for one full loop (both copies of the store list)
const LOOP_DURATION_S = stores.length * 3;

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
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let resumeTimer: ReturnType<typeof setTimeout>;

    function pause(ms: number) {
      track!.style.animationPlayState = "paused";
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        track!.style.animationPlayState = "running";
      }, ms);
    }

    const parent = track.parentElement!;
    parent.addEventListener("wheel", () => pause(2000), { passive: true });
    parent.addEventListener("touchstart", () => pause(5000), { passive: true });
    parent.addEventListener("touchend", () => pause(1500), { passive: true });
    parent.addEventListener("mouseenter", () => pause(60000));
    parent.addEventListener("mouseleave", () => {
      clearTimeout(resumeTimer);
      track.style.animationPlayState = "running";
    });

    return () => clearTimeout(resumeTimer);
  }, []);

  return (
    <>
      <style>{`
        @keyframes store-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div
        className="overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
        }}
      >
        <div
          ref={trackRef}
          className="flex gap-4 sm:gap-6"
          style={{
            animation: `store-scroll ${LOOP_DURATION_S}s linear infinite`,
            willChange: "transform",
          }}
        >
          {[...stores, ...stores].map((store, i) => (
            <StoreCard key={`${store.slug}-${i}`} store={store} />
          ))}
        </div>
      </div>
    </>
  );
}
