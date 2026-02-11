"use client";

import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useFavorites } from "./FavoritesProvider";

type FavoriteButtonProps = {
  type: "product" | "store";
  targetId: number | string;
  size?: "sm" | "md";
  className?: string;
};

export default function FavoriteButton({
  type,
  targetId,
  size = "sm",
  className = "",
}: FavoriteButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { isProductFavorited, isStoreFavorited, toggleProduct, toggleStore } = useFavorites();

  const isFavorited =
    type === "product"
      ? isProductFavorited(targetId as number)
      : isStoreFavorited(targetId as string);

  const iconSize = size === "sm" ? 16 : 22;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!session) {
      router.push("/login");
      return;
    }

    if (type === "product") {
      toggleProduct(targetId as number);
    } else {
      toggleStore(targetId as string);
    }
  }

  return (
    <button
      onClick={handleClick}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      className={`inline-flex items-center justify-center transition-all duration-200 ${
        size === "sm"
          ? "w-8 h-8 rounded-full bg-white/80 hover:bg-white shadow-sm"
          : "w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200"
      } ${className}`}
    >
      <Heart
        size={iconSize}
        className={`transition-colors duration-200 ${
          isFavorited ? "fill-red-500 text-red-500" : "fill-none text-black/60"
        }`}
      />
    </button>
  );
}
