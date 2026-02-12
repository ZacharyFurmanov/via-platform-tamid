"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type CartItem = {
  compositeId: string;
  title: string;
  price: number;
  image: string;
  storeName: string;
  storeSlug: string;
  externalUrl: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (compositeId: string) => void;
  clearCart: () => void;
  itemCount: number;
};

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  clearCart: () => {},
  itemCount: 0,
});

export function useCart() {
  return useContext(CartContext);
}

const STORAGE_KEY = "via-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Persist to localStorage on change (only after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      // Don't add duplicates
      if (prev.some((i) => i.compositeId === item.compositeId)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((compositeId: string) => {
    setItems((prev) => prev.filter((i) => i.compositeId !== compositeId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, clearCart, itemCount: items.length }}
    >
      {children}
    </CartContext.Provider>
  );
}
