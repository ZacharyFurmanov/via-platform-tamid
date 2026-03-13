import Image from "next/image";
import Link from "next/link";
import { stores } from "../lib/stores";

export default function StoreCarousel() {
  return (
    <div className="px-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-12">
        {stores.map((store) => (
          <Link
            key={store.slug}
            href={`/stores/${store.slug}`}
            className="group block"
          >
            <div className="aspect-[3/4] relative overflow-hidden" style={{ backgroundColor: store.image.includes("placeholder") ? "#FFFDF8" : undefined }}>
              {store.image.includes("placeholder") ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ backgroundColor: "#FFFDF8" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/via-logo.png"
                    alt="VYA"
                    className="w-16 sm:w-24 blur-[1px] opacity-40 select-none pointer-events-none"
                  />
                  <p className="text-[7px] sm:text-[8px] uppercase tracking-[0.3em] text-[#5D0F17]/40">
                    Coming Soon
                  </p>
                </div>
              ) : (
                <Image
                  src={store.image}
                  alt={store.name}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              )}
            </div>
            <div className="pt-2 sm:pt-3 pb-1 sm:pb-2">
              <p className="text-[9px] sm:text-xs uppercase tracking-wide text-[#5D0F17]/50 mb-0.5 sm:mb-1">
                {store.location}
              </p>
              <h3 className="font-serif text-xs sm:text-base text-[#5D0F17] leading-snug">
                {store.name}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
