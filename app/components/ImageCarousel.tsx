"use client";

import { useState, useCallback, useRef } from "react";
import { resizeImage } from "@/app/lib/imageUtils";

type ImageCarouselProps = {
  images: string[];
  alt: string;
  variant: "card" | "detail";
  isEditorsPick?: boolean;
};

export default function ImageCarousel({
  images,
  alt,
  variant,
  isEditorsPick,
}: ImageCarouselProps) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);
  const isDragging = useRef(false);

  const safeImages = images.length > 0 ? images : ["/placeholder.jpg"];
  const hasMultiple = safeImages.length > 1;

  const goTo = useCallback(
    (idx: number) => {
      setCurrent((idx + safeImages.length) % safeImages.length);
    },
    [safeImages.length]
  );

  const prev = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      goTo(current - 1);
    },
    [current, goTo]
  );

  const next = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      goTo(current + 1);
    },
    [current, goTo]
  );

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 30) {
        goTo(current + (diff > 0 ? 1 : -1));
      }
      touchStartX.current = null;
    },
    [current, goTo]
  );

  // Mouse drag handlers (for laptop trackpad / desktop drag)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    isDragging.current = false;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    if (Math.abs(e.clientX - mouseStartX.current) > 5) {
      isDragging.current = true;
    }
  }, []);

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (mouseStartX.current === null) return;
      const diff = mouseStartX.current - e.clientX;
      if (Math.abs(diff) > 30) {
        e.preventDefault();
        goTo(current + (diff > 0 ? 1 : -1));
      }
      mouseStartX.current = null;
    },
    [current, goTo]
  );

  const handleDotClick = useCallback(
    (e: React.MouseEvent, idx: number) => {
      e.preventDefault();
      e.stopPropagation();
      goTo(idx);
    },
    [goTo]
  );

  // Pre-render current + adjacent images with instant opacity swap
  const renderImages = (sizeHint: number, objectPosition = "object-top") =>
    safeImages.map((src, idx) => {
      const isAdjacentOrCurrent =
        idx === current ||
        idx === (current + 1) % safeImages.length ||
        idx === (current - 1 + safeImages.length) % safeImages.length;
      if (!isAdjacentOrCurrent) return null;
      return (
        <img
          key={idx}
          src={resizeImage(src, sizeHint)}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover ${objectPosition} transition-opacity duration-150 ${
            idx === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          loading="eager"
          decoding="async"
        />
      );
    });

  // ── Card variant ──
  if (variant === "card") {
    return (
      <div
        className="relative aspect-[3/4] w-full overflow-hidden bg-[#D8CABD]/30 group/carousel cursor-grab active:cursor-grabbing"
        onTouchStart={hasMultiple ? onTouchStart : undefined}
        onTouchEnd={hasMultiple ? onTouchEnd : undefined}
        onMouseDown={hasMultiple ? onMouseDown : undefined}
        onMouseMove={hasMultiple ? onMouseMove : undefined}
        onMouseUp={hasMultiple ? onMouseUp : undefined}
      >
        {renderImages(600, "object-center")}

        {safeImages[0] === "/placeholder.jpg" && (
          <div className="absolute inset-0 bg-[#D8CABD]/50 z-10" />
        )}

        {isEditorsPick && (
          <div className="hidden sm:block absolute top-2 left-2 z-40 bg-[#5D0F17] px-2 py-0.5">
            <span className="text-[#F7F3EA] text-[9px] uppercase tracking-[0.15em] font-medium">
              Editor&apos;s Pick
            </span>
          </div>
        )}

        {hasMultiple && (
          <>
            {/* Left arrow */}
            <button
              onClick={prev}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-30"
              aria-label="Previous image"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Right arrow */}
            <button
              onClick={next}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-30"
              aria-label="Next image"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-30">
              {safeImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => handleDotClick(e, idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === current
                      ? "bg-white w-3"
                      : "bg-white/50 hover:bg-white/80"
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Detail variant ──
  return (
    <div>
      <div
        className="relative aspect-[2/3] md:aspect-[3/4] w-full overflow-hidden bg-[#D8CABD]/30 cursor-grab active:cursor-grabbing"
        onTouchStart={hasMultiple ? onTouchStart : undefined}
        onTouchEnd={hasMultiple ? onTouchEnd : undefined}
        onMouseDown={hasMultiple ? onMouseDown : undefined}
        onMouseMove={hasMultiple ? onMouseMove : undefined}
        onMouseUp={hasMultiple ? onMouseUp : undefined}
      >
        {renderImages(1200, "object-center")}

        {safeImages[0] === "/placeholder.jpg" && (
          <div className="absolute inset-0 bg-[#D8CABD]/50" />
        )}

        {hasMultiple && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition z-20"
              aria-label="Previous image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition z-20"
              aria-label="Next image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {safeImages.map((src, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`flex-shrink-0 w-16 h-20 overflow-hidden rounded transition-all ${
                idx === current
                  ? "ring-2 ring-black opacity-100"
                  : "opacity-50 hover:opacity-80"
              }`}
              aria-label={`View image ${idx + 1}`}
            >
              <img
                src={resizeImage(src, 200)}
                alt={`${alt} ${idx + 1}`}
                className="w-full h-full object-cover object-center"
                loading="eager"
                decoding="async"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
