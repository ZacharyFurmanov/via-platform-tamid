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
            <div className="aspect-[3/4] relative overflow-hidden mb-3 sm:mb-4 rounded-sm bg-[#D8CABD]/30">
              <Image
                src={store.image}
                alt={store.name}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
            <h3 className="font-serif text-lg text-[#5D0F17] mb-0.5">
              {store.name}
            </h3>
            <p className="text-sm text-[#5D0F17]/50">
              {store.location}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
