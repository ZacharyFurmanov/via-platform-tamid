import Link from "next/link";
import type { CategoryLabel } from "@/app/lib/categoryMap";
import ImageCarousel from "./ImageCarousel";

type ProductCardProps = {
  id: string;
  name: string;
  price: string;
  category: CategoryLabel;
  storeName: string;
  storeSlug: string;
  externalUrl?: string;
  image: string;
  images?: string[];
};

export default function ProductCard({
  id,
  name,
  price,
  category,
  storeName,
  image,
  images,
}: ProductCardProps) {
  const carouselImages =
    images && images.length > 0 ? images : image ? [image] : [];

  return (
    <Link href={`/products/${id}`} className="group cursor-pointer text-black block">
      <ImageCarousel images={carouselImages} alt={name} variant="card" />

      {/* Product info with mobile-friendly text sizes */}
      <div className="pt-3 pb-2">
        <p className="text-[11px] sm:text-xs uppercase tracking-wide text-black/60 mb-1">
          {storeName}
        </p>

        <h3 className="font-serif text-base sm:text-lg text-black leading-snug line-clamp-2">
          {name}
        </h3>

        <p className="text-xs sm:text-sm text-black/70 mt-0.5">{category}</p>

        <p className="text-sm sm:text-base mt-1 text-black font-medium">{price}</p>
      </div>
    </Link>
  );
}
