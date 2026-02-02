import type { CategoryLabel } from "@/app/lib/categoryMap";

type ProductCardProps = {
  id: string;
  name: string;
  price: string;
  category: CategoryLabel;
  storeName: string;
  storeSlug: string;
  externalUrl?: string;
  image: string;
  onClick?: () => void;
};

export default function ProductCard({
  name,
  price,
  category,
  storeName,
  image,
  onClick,
}: ProductCardProps) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer text-black block"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Image container with consistent aspect ratio */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
        <img
          src={image || "/placeholder.jpg"}
          alt={name}
          className="w-full h-full object-cover object-top"
          loading="lazy"
        />
        {!image && <div className="absolute inset-0 bg-neutral-200" />}
        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition" />
      </div>

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
    </div>
  );
}
