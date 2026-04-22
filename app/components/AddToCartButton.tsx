"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart, CartItem } from "./CartProvider";
import { trackAddToCart } from "@/app/lib/firebase-analytics";

type AddToCartButtonProps = {
  item: CartItem;
};

export default function AddToCartButton({ item }: AddToCartButtonProps) {
  const { addItem, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const pathname = usePathname();

  const alreadyInCart = items.some((i) => i.compositeId === item.compositeId);

  const handleClick = () => {
    if (alreadyInCart) return;
    addItem(item);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 3000);

    trackAddToCart(
      {
        itemId: item.compositeId,
        itemName: item.title,
        price: item.price,
        storeName: item.storeName,
        storeSlug: item.storeSlug,
      },
      pathname
    );

    // Track cart add for demand signal and abandoned cart emails
    const dbId = parseInt(item.compositeId.match(/-(\d+)$/)?.[1] ?? "0", 10);
    if (dbId) {
      fetch("/api/cart/count", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: dbId,
          title: item.title,
          image: item.image,
          storeName: item.storeName,
          storeSlug: item.storeSlug,
          price: item.price,
        }),
      }).catch(() => {});
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={handleClick}
        disabled={alreadyInCart || justAdded}
        className={`block w-full py-4 text-sm uppercase tracking-wide text-center transition border ${
          justAdded || alreadyInCart
            ? "border-[#5D0F17]/30 text-[#5D0F17]/40 cursor-default"
            : "border-[#5D0F17] text-[#5D0F17] hover:bg-[#5D0F17]/5"
        }`}
      >
        {justAdded ? "Added to Cart" : alreadyInCart ? "In Cart" : "Add to Cart"}
      </button>
      {justAdded && (
        <Link
          href="/cart"
          className="block w-full py-2.5 text-xs uppercase tracking-[0.15em] text-center text-[#5D0F17]/60 hover:text-[#5D0F17] transition"
        >
          View Cart →
        </Link>
      )}
    </div>
  );
}
