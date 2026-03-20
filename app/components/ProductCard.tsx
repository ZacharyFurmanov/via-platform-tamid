"use client";

import Link from "next/link";
import type { CategoryLabel } from "@/app/lib/categoryMap";
import ImageCarousel from "./ImageCarousel";
import FavoriteButton from "./FavoriteButton";
import { normalizeSize } from "@/app/lib/inventory";

const SIZE_LABELS: Record<string, string> = {
  XS: "Extra Small",
  S: "Small",
  M: "Medium",
  L: "Large",
  XL: "Extra Large",
  XXL: "XXL",
  XXXL: "XXXL",
  "One Size": "One Size",
};

const CLOTHING_SIZES = new Set(["XS", "S", "M", "L", "XL", "XXL", "XXXL"]);

function expandSize(size: string, category?: string, title?: string): string {
  const normalized = normalizeSize(size);

  // For shoes: if stored size is a clothing label but title has a numeric shoe size, prefer that
  if (category === "Shoes" && CLOTHING_SIZES.has(normalized) && title) {
    const match = title.match(/\b(\d{2}(?:\.\d)?)\s*$/);
    if (match) return match[1];
  }

  return SIZE_LABELS[normalized] ?? normalized;
}

// Strip "Size X" patterns from a product title when size is already shown separately
function stripSizeFromTitle(title: string, size: string | null | undefined): string {
  if (!size) return title;
  const result = title
    // "(Size M)" or "(size 38)" anywhere
    .replace(/\s*\(\s*size\s*:?\s*[^)]+\)\s*/gi, " ")
    // Bare size in parens: "(S)", "(M)", "(38)", "(EU 38)"
    .replace(/\s*\(\s*(?:Extra\s+Small|Extra\s+Large|X{0,3}S|M|L|X{1,3}L|OS(?:FM)?|One\s+Size|(?:US|UK|EU|IT)?\s*\d{1,2}(?:[.,]\d)?|(?:US|UK|EU|IT)\s*\d{1,2}(?:[.,]\d)?)\s*\)\s*/gi, " ")
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

          <h3 className="font-serif text-xs sm:text-base text-[#5D0F17] leading-snug line-clamp-2 mb-0.5">
            {stripSizeFromTitle(name, size)}
          </h3>

          {size && (
            <p className="text-[9px] sm:text-[11px] uppercase tracking-wide text-[#5D0F17]/50 mb-0.5">
              Size: {expandSize(size, category, name)}
            </p>
          )}

          <div className="flex items-baseline gap-2">
            <p className="text-xs sm:text-sm text-[#5D0F17]/80">{price}</p>
            {compareAtPrice && (
              <p className="text-xs sm:text-sm text-[#5D0F17]/40 line-through">{compareAtPrice}</p>
            )}
          </div>
        </div>
      </Link>

      {/* Favorite button overlay */}
      {numericId != null && (
        <div className="absolute top-2 right-2 z-40 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <FavoriteButton type="product" targetId={numericId} size="sm" favoriteCount={favoriteCount} />
        </div>
      )}
    </div>
  );
}
