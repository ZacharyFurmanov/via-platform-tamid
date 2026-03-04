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
            <div className="aspect-[3/4] relative overflow-hidden bg-[#D8CABD]/30">
              <Image
                src={store.image}
                alt={store.name}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className={`${store.imageFit === "contain" ? "object-contain p-2 sm:p-3" : "object-cover"} transition-transform duration-700 ease-out group-hover:scale-105`}
              />
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
