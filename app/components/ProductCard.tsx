import Link from "next/link";
import type { CategoryLabel } from "@/app/lib/categoryMap";
import ImageCarousel from "./ImageCarousel";
import FavoriteButton from "./FavoriteButton";
import { normalizeSize } from "@/app/lib/inventory";

// Strip "Size X" patterns from a product title when size is already shown separately
function stripSizeFromTitle(title: string, size: string | null | undefined): string {
  if (!size) return title;
  const result = title
    // "(Size M)" or "(size 38)" anywhere
    .replace(/\s*\(\s*size\s*:?\s*[^)]+\)\s*/gi, " ")
    // "- Size M", "/ Size M", ", Size M", "| Size M" at end
    .replace(/\s*[-–—|\/,]+\s*size\s*:?\s*\S+\s*$/gi, "")
    // " Size M" at end (space before "size")
    .replace(/\s+size\s*:?\s*\S+\s*$/gi, "")
    .trim();
  return result || title;
}

type ProductCardProps = {
  id: string;
  dbId?: number;
  name: string;
  price: string;
  compareAtPrice?: string;
  category: CategoryLabel;
  storeName: string;
  storeSlug: string;
  externalUrl?: string;
  image: string;
  images?: string[];
  favoriteCount?: number;
  from?: string;
  size?: string | null;
  isEditorsPick?: boolean;
  soldOut?: boolean;
};

export default function ProductCard({
  id,
  dbId,
  name,
  price,
  compareAtPrice,
  category,
  storeName,
  image,
  images,
  favoriteCount,
  from,
  size,
  isEditorsPick,
  soldOut,
}: ProductCardProps) {
  const carouselImages =
    images && images.length > 0 ? images : image ? [image] : [];

  // Parse dbId from composite id if not provided (e.g. "lei-vintage-42" -> 42)
  const numericId = dbId ?? (() => {
    const match = id.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  })();

  return (
    <div className="relative group">
      {soldOut && (
        <div className="absolute inset-0 z-20 bg-[#F7F3EA]/70 pointer-events-none flex items-start justify-center pt-8 sm:pt-10">
          <span className="bg-[#F7F3EA]/95 border border-[#5D0F17]/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#5D0F17]/50">
            Sold Out
          </span>
        </div>
      )}
      <Link
        href={soldOut ? "#" : (from ? `/products/${id}?from=${encodeURIComponent(from)}` : `/products/${id}`)}
        className={`cursor-pointer text-[#5D0F17] block ${soldOut ? "opacity-40 pointer-events-none" : ""}`}
      >
        <ImageCarousel images={carouselImages} alt={name} variant="card" isEditorsPick={isEditorsPick} />

        {/* Product info */}
        <div className="pt-2 sm:pt-3 pb-1 sm:pb-2">
          <p className="text-[9px] sm:text-xs uppercase tracking-wide text-[#5D0F17]/50 mb-0.5 sm:mb-1 transition-colors duration-300 group-hover:text-[#5D0F17]/80">
            {storeName}
          </p>

          <h3 className="font-serif text-xs sm:text-base text-[#5D0F17] leading-snug line-clamp-2">
            {stripSizeFromTitle(name, size)}
          </h3>

          <div className="flex items-baseline gap-2 mt-0.5 sm:mt-1">
            <p className="text-xs sm:text-sm text-[#5D0F17]/80">{price}</p>
            {compareAtPrice && (
              <p className="text-xs sm:text-sm text-[#5D0F17]/40 line-through">{compareAtPrice}</p>
            )}
            {size && (
              <span className="text-[9px] sm:text-xs uppercase tracking-wide text-[#5D0F17]/50">
                {normalizeSize(size)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Favorite button overlay */}
      {numericId != null && (
        <div className="absolute top-2 right-2 z-40 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
          <FavoriteButton type="product" targetId={numericId} size="sm" favoriteCount={favoriteCount} />
        </div>
      )}
    </div>
  );
}
