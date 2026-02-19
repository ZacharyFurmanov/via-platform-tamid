"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

interface Story {
  slug: string;
  store: string;
  teaser: string;
  image: string;
  logo: string;
  logoBg: string;
  logoDark?: boolean;
}

export default function StoriesHero({ stories }: { stories: Story[] }) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % stories.length);
  }, [stories.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + stories.length) % stories.length);
  }, [stories.length]);

  // Auto-advance every 6 seconds
  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const story = stories[current];

  return (
    <div className="relative overflow-hidden rounded-sm">
      {/* Two-column layout: logo panel + image */}
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[500px] sm:min-h-[560px]">
        {/* Left: Logo + text panel */}
        <div className="relative flex flex-col justify-center items-center text-center px-8 sm:px-12 py-12 sm:py-16 bg-white order-2 md:order-1">
          {/* Logo */}
          <div
            key={story.slug + "-logo"}
            className="animate-fade-in mb-6 sm:mb-8"
          >
            <div
              className="relative w-48 h-24 sm:w-56 sm:h-28 mx-auto rounded-sm overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: story.logoBg }}
            >
              <Image
                src={story.logo}
                alt={story.store}
                fill
                className={story.logoBg === "#ffffff" ? "object-contain p-3" : "object-cover"}
              />
            </div>
          </div>

          {/* Teaser */}
          <p
            key={story.slug + "-teaser"}
            className="animate-fade-in max-w-sm text-black/60 text-sm sm:text-base leading-relaxed mb-8 italic font-serif"
          >
            &ldquo;{story.teaser}&rdquo;
          </p>

          <Link
            href={`/stories/${story.slug}`}
            className="inline-block bg-black text-white px-8 py-3 text-xs uppercase tracking-[0.15em] hover:bg-neutral-800 transition"
          >
            Read Story
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-4 mt-8">
            <button
              onClick={prev}
              aria-label="Previous story"
              className="text-black/30 hover:text-black transition text-sm"
            >
              &larr;
            </button>
            <div className="flex gap-2">
              {stories.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to story ${i + 1}`}
                  className={`h-[2px] transition-all duration-500 ${
                    i === current
                      ? "w-8 bg-black"
                      : "w-4 bg-black/20 hover:bg-black/40"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              aria-label="Next story"
              className="text-black/30 hover:text-black transition text-sm"
            >
              &rarr;
            </button>
          </div>
        </div>

        {/* Right: Store image */}
        <div className="relative aspect-[4/5] md:aspect-auto overflow-hidden order-1 md:order-2">
          {stories.map((s, i) => (
            <div
              key={s.slug}
              className="absolute inset-0 transition-opacity duration-1000"
              style={{ opacity: i === current ? 1 : 0 }}
            >
              <Image
                src={s.image}
                alt={s.store}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
