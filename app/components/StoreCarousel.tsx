"use client";

import Image from "next/image";
import Link from "next/link";
import { stores } from "../lib/stores";

export default function StoreCarousel() {
  return (
    <div className="overflow-x-auto scrollbar-hide touch-pan-x [&_img]:select-none [&_img]:pointer-events-none">
      <div className="flex gap-4 pl-6 pr-6 sm:gap-6">
        {stores.map((store) => (
          <Link
            key={store.slug}
            href={`/stores/${store.slug}`}
            className="group block w-[72vw] sm:w-[40vw] md:w-[28vw] lg:w-[22vw] flex-shrink-0"
          >
            <div className="aspect-[3/4] relative overflow-hidden mb-3 sm:mb-4 rounded-sm">
              <Image
                src={store.image}
                alt={store.name}
                fill
                sizes="(min-width: 1024px) 22vw, (min-width: 768px) 28vw, (min-width: 640px) 40vw, 72vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-500" />
            </div>
            <h3 className="font-serif text-lg text-black mb-0.5">
              {store.name}
            </h3>
            <p className="text-sm text-neutral-500">
              {store.location}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
