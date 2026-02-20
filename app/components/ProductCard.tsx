import type { CategoryLabel } from "@/app/lib/categoryMap";
import ImageCarousel from "./ImageCarousel";
import FavoriteButton from "./FavoriteButton";
import AuthProductLink from "./AuthProductLink";

type ProductCardProps = {
  id: string;
  dbId?: number;
  name: string;
  price: string;
  category: CategoryLabel;
  storeName: string;
  storeSlug: string;
  externalUrl?: string;
  image: string;
  images?: string[];
  favoriteCount?: number;
  from?: string;
};

export default function ProductCard({
  id,
  dbId,
  name,
  price,
  category,
  storeName,
  image,
  images,
  favoriteCount,
  from,
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
      <AuthProductLink href={from ? `/products/${id}?from=${encodeURIComponent(from)}` : `/products/${id}`} className="cursor-pointer text-black block">
        <ImageCarousel images={carouselImages} alt={name} variant="card" />

        {/* Product info with mobile-friendly text sizes */}
        <div className="pt-3 pb-2">
          <p className="text-[11px] sm:text-xs uppercase tracking-wide text-black/50 mb-1 transition-colors duration-300 group-hover:text-black/80">
            {storeName}
          </p>

          <h3 className="font-serif text-sm sm:text-base text-black leading-snug line-clamp-2">
            {name}
          </h3>

          <p className="text-sm mt-1 text-black/80">{price}</p>
        </div>
      </AuthProductLink>

      {/* Favorite button overlay */}
      {numericId != null && (
        <div className="absolute top-2 right-2 z-40 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
          <FavoriteButton type="product" targetId={numericId} size="sm" favoriteCount={favoriteCount} />
        </div>
      )}
    </div>
  );
}
