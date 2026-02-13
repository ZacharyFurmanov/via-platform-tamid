"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

interface Story {
  slug: string;
  store: string;
  teaser: string;
  image: string;
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
    <section className="relative h-[70vh] sm:h-[80vh] overflow-hidden">
      {/* Background images */}
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
            priority={i === 0}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-16 sm:pb-20">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <p className="text-xs uppercase tracking-[0.25em] text-white/60 mb-3">
            The Story Behind the Selection
          </p>
          <h1
            key={story.slug}
            className="text-3xl sm:text-5xl lg:text-6xl font-serif text-white mb-4 animate-fade-in"
          >
            {story.store}
          </h1>
          <p
            key={story.slug + "-teaser"}
            className="max-w-xl text-white/80 text-sm sm:text-base leading-relaxed mb-6 animate-fade-in"
          >
            {story.teaser}
          </p>
          <Link
            href={`/stories/${story.slug}`}
            className="inline-block bg-white text-black px-6 py-3 text-xs uppercase tracking-wide hover:bg-white/90 transition"
          >
            Read Story
          </Link>

          {/* Indicators + arrows */}
          <div className="flex items-center gap-4 mt-8">
            <button
              onClick={prev}
              aria-label="Previous story"
              className="text-white/60 hover:text-white transition text-sm"
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
                      ? "w-8 bg-white"
                      : "w-4 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              aria-label="Next story"
              className="text-white/60 hover:text-white transition text-sm"
            >
              &rarr;
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
