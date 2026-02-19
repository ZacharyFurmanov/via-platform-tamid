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
        <div className="max-w-4xl mx-auto px-6 space-y-10">
          {storeGroups.map((group) => {
            const groupTotal = group.items.reduce((sum, i) => sum + i.price, 0);

            return (
              <div
                key={group.storeSlug}
                className="border border-neutral-200 rounded-sm overflow-hidden"
              >
                {/* Store header */}
                <div className="bg-neutral-50 px-5 py-4 flex items-center justify-between">
                  <Link
                    href={`/stores/${group.storeSlug}`}
                    className="hover:underline transition"
                  >
                    <span className="font-medium text-black">
                      {group.storeName}
                    </span>
                    <span className="text-neutral-500 text-sm ml-2">
                      {group.items.length}{" "}
                      {group.items.length === 1 ? "item" : "items"}
                    </span>
                  </Link>
                  <span className="text-sm font-medium text-black">
                    ${groupTotal.toFixed(2)}
                  </span>
                </div>

                {/* Items */}
                <div className="divide-y divide-neutral-100">
                  {group.items.map((item) => (
                    <div
                      key={item.compositeId}
                      className="flex gap-4 sm:gap-5 px-5 py-4"
                    >
                      {/* Thumbnail */}
                      <Link
                        href={`/products/${item.compositeId}`}
                        className="flex-shrink-0"
                      >
                        <div className="w-16 h-20 sm:w-20 sm:h-24 bg-neutral-100 overflow-hidden">
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
                      <div className="flex-1 min-w-0 flex items-center">
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/products/${item.compositeId}`}
                            className="font-serif text-base text-black leading-snug line-clamp-2 hover:underline"
                          >
                            {item.title}
                          </Link>
                          <p className="text-sm text-neutral-600 mt-0.5">
                            ${item.price}
                          </p>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeItem(item.compositeId)}
                          className="flex-shrink-0 p-2 text-neutral-400 hover:text-black transition ml-2"
                          aria-label={`Remove ${item.title}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Store checkout button */}
                <div className="px-5 py-4 border-t border-neutral-200 bg-neutral-50">
                  <a
                    href={(() => {
                      const firstItem = group.items[0];

                      // Aggregate all items into a single Shopify cart URL
                      // Format: /cart/VARIANT1:1,VARIANT2:1?discount=CODE
                      let aggregatedUrl = firstItem.checkoutUrl;
                      try {
                        const isShopifyCart = firstItem.checkoutUrl.includes("/cart/");
                        if (isShopifyCart && group.items.length > 1) {
                          const variantParts: string[] = [];
                          for (const item of group.items) {
                            const m = item.checkoutUrl.match(/\/cart\/([^?,]+)/);
                            if (m) variantParts.push(m[1]);
                          }
                          const url = new URL(firstItem.checkoutUrl);
                          const discount = url.searchParams.get("discount");
                          const discountParam = discount ? `?discount=${discount}` : "";
                          aggregatedUrl = `${url.origin}/cart/${variantParts.join(",")}${discountParam}`;
                        }
                      } catch {
                        // For non-Shopify stores or invalid URLs, fall back to first item
                      }

                      const params = new URLSearchParams({
                        pid: firstItem.compositeId,
                        pn: group.items.length > 1
                          ? `${group.items.length} items from ${group.storeName}`
                          : firstItem.title,
                        s: firstItem.storeName,
                        ss: firstItem.storeSlug,
                        url: aggregatedUrl,
                      });
                      return `/api/track?${params.toString()}`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-black text-white text-center py-3 text-sm uppercase tracking-wide hover:bg-neutral-800 transition"
                  >
                    Checkout on {group.storeName} &rarr;
                  </a>
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
