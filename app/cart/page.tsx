"use client";

import { useMemo } from "react";
import Link from "next/link";
import { X, ShoppingCart } from "lucide-react";
import { useCart } from "@/app/components/CartProvider";

export default function CartPage() {
  const { items, removeItem, clearCart, itemCount } = useCart();

  // Group items by store
  const storeGroups = useMemo(() => {
    const groups: Record<
      string,
      { storeName: string; storeSlug: string; items: typeof items }
    > = {};

    for (const item of items) {
      if (!groups[item.storeSlug]) {
        groups[item.storeSlug] = {
          storeName: item.storeName,
          storeSlug: item.storeSlug,
          items: [],
        };
      }
      groups[item.storeSlug].items.push(item);
    }

    return Object.values(groups);
  }, [items]);

  if (itemCount === 0) {
    return (
      <main className="bg-white min-h-screen text-black">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <ShoppingCart size={48} className="mx-auto mb-6 text-neutral-300" />
          <h1 className="text-2xl sm:text-3xl font-serif mb-4">
            Your cart is empty
          </h1>
          <p className="text-neutral-500 mb-8">
            Browse our stores and add items to your cart.
          </p>
          <Link
            href="/stores"
            className="inline-block bg-black text-white px-8 py-3 text-sm uppercase tracking-wide hover:bg-neutral-800 transition"
          >
            Explore Stores
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-white min-h-screen text-black">
      <section className="border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif mb-1">Your Cart</h1>
              <p className="text-sm text-neutral-500">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </p>
            </div>
            <button
              onClick={clearCart}
              className="text-xs uppercase tracking-wide text-neutral-500 hover:text-black transition underline"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-6 space-y-12">
          {storeGroups.map((group) => {
            // Build a single checkout URL for the first item (each item checks out individually)
            return (
              <div key={group.storeSlug}>
                {/* Store header */}
                <div className="flex items-center justify-between mb-6">
                  <Link
                    href={`/stores/${group.storeSlug}`}
                    className="text-xs uppercase tracking-[0.2em] text-neutral-500 hover:text-black transition"
                  >
                    {group.storeName}
                  </Link>
                </div>

                {/* Items */}
                <div className="space-y-4">
                  {group.items.map((item) => {
                    // Route through /api/track for click logging + via_click_id attribution
                    const trackingParams = new URLSearchParams({
                      pid: item.compositeId,
                      pn: item.title,
                      s: item.storeName,
                      ss: item.storeSlug,
                      url: item.checkoutUrl,
                    });
                    const trackingUrl = `/api/track?${trackingParams.toString()}`;

                    return (
                      <div
                        key={item.compositeId}
                        className="flex gap-4 sm:gap-6 border-b border-neutral-100 pb-4"
                      >
                        {/* Thumbnail */}
                        <Link
                          href={`/products/${item.compositeId}`}
                          className="flex-shrink-0"
                        >
                          <div className="w-20 h-24 sm:w-24 sm:h-32 bg-neutral-100 overflow-hidden">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                                No image
                              </div>
                            )}
                          </div>
                        </Link>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/products/${item.compositeId}`}
                            className="font-serif text-base sm:text-lg text-black leading-snug line-clamp-2 hover:underline"
                          >
                            {item.title}
                          </Link>
                          <p className="text-sm font-medium text-black mt-1">
                            ${item.price}
                          </p>

                          {/* Per-item checkout */}
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-3 text-xs uppercase tracking-wide underline text-neutral-600 hover:text-black transition"
                          >
                            Checkout at {item.storeName} &rarr;
                          </a>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeItem(item.compositeId)}
                          className="flex-shrink-0 p-2 text-neutral-400 hover:text-black transition"
                          aria-label={`Remove ${item.title}`}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Note */}
      <section className="border-t border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="text-xs text-neutral-400">
            Each item checks out directly on the store&apos;s website.
            Shipping and returns are handled by each store.
          </p>
        </div>
      </section>
    </main>
  );
}
