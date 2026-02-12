"use client";

import { useState } from "react";
import { useCart, CartItem } from "./CartProvider";

type AddToCartButtonProps = {
  item: CartItem;
};

export default function AddToCartButton({ item }: AddToCartButtonProps) {
  const { addItem, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const alreadyInCart = items.some((i) => i.compositeId === item.compositeId);

  const handleClick = () => {
    if (alreadyInCart) return;
    addItem(item);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <button
      onClick={handleClick}
      disabled={alreadyInCart && !justAdded}
      className={`block w-full py-4 text-sm uppercase tracking-wide text-center transition ${
        justAdded
          ? "bg-green-700 text-white"
          : alreadyInCart
          ? "bg-neutral-300 text-white cursor-default"
          : "bg-black text-white hover:bg-neutral-800"
      }`}
    >
      {justAdded ? "Added to Cart!" : alreadyInCart ? "In Cart" : "Add to Cart"}
    </button>
  );
}
