import Link from "next/link";
import type { CategoryLabel } from "@/app/lib/categoryMap";
import { createTrackingUrl } from "@/app/lib/track";

type ProductCardProps = {
  id: string;
  name: string;
  price: string;
  category: CategoryLabel;
  storeName: string;
  storeSlug: string;
  externalUrl?: string;
  image: string;
};

export default function ProductCard({
  id,
  name,
  price,
  category,
  storeName,
  storeSlug,
  externalUrl,
  image,
}: ProductCardProps) {
  const CardInner = (
    <>
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-transparent">
        <img
          src={image || "/placeholder.jpg"}
          alt={name}
          className="w-full h-full object-cover object-top"
        />
        {!image && <div className="w-full h-full bg-neutral-200" />}
        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition" />
      </div>

      <p className="text-xs uppercase tracking-wide text-black/60 mb-1">
        {storeName}
      </p>

      <h3 className="font-serif text-lg text-black leading-snug">{name}</h3>

      <p className="text-sm text-black/70">{category}</p>

      <p className="text-sm mt-1 text-black">{price}</p>
    </>
  );

  // External product with tracking
  if (externalUrl) {
    const trackingUrl = createTrackingUrl(
      id,
      name,
      storeName,
      storeSlug,
      externalUrl
    );

    return (
      <a
        href={trackingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group cursor-pointer text-black block"
      >
        {CardInner}
      </a>
    );
  }

  // Internal product (future-proofing)
  return (
    <Link href="#" className="group cursor-pointer text-black block">
      {CardInner}
    </Link>
  );
}
