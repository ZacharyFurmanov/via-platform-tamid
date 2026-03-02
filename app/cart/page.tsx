"use client";

import { useMemo, useEffect } from "react";
import Link from "next/link";
import { X, ShoppingCart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCart, CartItem } from "@/app/components/CartProvider";
import { useSignUp } from "@/app/components/SignUpProvider";

/**
 * Build a Shopify multi-cart URL from a group of items.
 * Format: https://store.com/cart/VAR1:1,VAR2:1,VAR3:1
 * Falls back to first item's external URL if any item lacks a variant ID.
 */
function buildGroupCheckoutUrl(items: CartItem[]): string {
  const variantEntries: string[] = [];
  let storeOrigin = "";
  let discountCode = "";

  for (const item of items) {
    if (!item.checkoutUrl) return items[0].externalUrl;
    try {
      const url = new URL(item.checkoutUrl);
      if (!storeOrigin) storeOrigin = url.origin;
      if (!discountCode) discountCode = url.searchParams.get("discount") || "";
      const cartMatch = url.pathname.match(/^\/cart\/(\d+):(\d+)/);
      if (!cartMatch) return items[0].externalUrl;
      variantEntries.push(`${cartMatch[1]}:${cartMatch[2]}`);
    } catch {
      return items[0].externalUrl;
    }
  }

  if (!storeOrigin || variantEntries.length === 0) return items[0].externalUrl;
  const discountParam = discountCode ? `?discount=${discountCode}` : "";
  return `${storeOrigin}/cart/${variantEntries.join(",")}${discountParam}`;
}

export default function CartPage() {
  const { items, removeItem, clearCart, itemCount } = useCart();
  const { data: session, status } = useSession();
  const { openModal } = useSignUp();

  // Auto-open the sign-in modal for unauthenticated users with items in cart
  const needsAuth = status !== "loading" && !session && itemCount > 0;

  useEffect(() => {
    if (needsAuth) {
      openModal("/cart", { required: true });
    }
  }, [needsAuth, openModal]);

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
      <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <ShoppingCart size={48} className="mx-auto mb-6 text-[#5D0F17]/30" />
          <h1 className="text-2xl sm:text-3xl font-serif mb-4">
            Your cart is empty
          </h1>
          <p className="text-[#5D0F17]/50 mb-8">
            Browse our stores and add items to your cart.
          </p>
          <Link
            href="/stores"
            className="inline-block bg-[#5D0F17] text-[#F7F3EA] px-8 py-3 text-sm uppercase tracking-wide hover:bg-[#5D0F17]/85 transition"
          >
            Explore Stores
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif mb-1">Your Cart</h1>
              <p className="text-sm text-[#5D0F17]/50">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </p>
            </div>
            <button
              onClick={clearCart}
              className="text-xs uppercase tracking-wide text-[#5D0F17]/50 hover:text-[#5D0F17] transition underline"
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
                className="border border-[#5D0F17]/10 overflow-hidden"
              >
                {/* Store header */}
                <div className="bg-[#D8CABD]/20 px-5 py-4 flex items-center justify-between">
                  <Link
                    href={`/stores/${group.storeSlug}`}
                    className="hover:underline transition"
                  >
                    <span className="font-medium text-[#5D0F17]">
                      {group.storeName}
                    </span>
                    <span className="text-[#5D0F17]/50 text-sm ml-2">
                      {group.items.length}{" "}
                      {group.items.length === 1 ? "item" : "items"}
                    </span>
                  </Link>
                  <span className="text-sm font-medium text-[#5D0F17]">
                    ${groupTotal.toFixed(2)}
                  </span>
                </div>

                {/* Items */}
                <div className="divide-y divide-[#5D0F17]/10">
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
                        <div className="w-16 h-20 sm:w-20 sm:h-24 bg-[#D8CABD]/30 overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#5D0F17]/40 text-xs">
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
                            className="font-serif text-base text-[#5D0F17] leading-snug line-clamp-2 hover:underline"
                          >
                            {item.title}
                          </Link>
                          <p className="text-sm text-[#5D0F17]/60 mt-0.5">
                            ${item.price}
                          </p>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeItem(item.compositeId)}
                          className="flex-shrink-0 p-2 text-[#5D0F17]/40 hover:text-[#5D0F17] transition ml-2"
                          aria-label={`Remove ${item.title}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Store checkout button */}
                <div className="px-5 py-4 border-t border-[#5D0F17]/10 bg-[#D8CABD]/20">
                  <a
                    href={(() => {
                      const firstItem = group.items[0];
                      // Single item with a collabs link → route through it to set affiliate cookie
                      // Multi-item → build direct multi-cart URL (collabs cookie may already be set
                      // if the user browsed through VIA first)
                      const cartUrl =
                        group.items.length === 1 && firstItem.collabsLink
                          ? firstItem.collabsLink
                          : buildGroupCheckoutUrl(group.items);
                      const params = new URLSearchParams({
                        pid: firstItem.compositeId,
                        pn: group.items.length > 1
                          ? `${group.items.length} items from ${group.storeName}`
                          : firstItem.title,
                        s: firstItem.storeName,
                        ss: firstItem.storeSlug,
                        url: cartUrl,
                      });
                      return `/api/track?${params.toString()}`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-[#5D0F17] text-[#F7F3EA] text-center py-3 text-sm uppercase tracking-wide hover:bg-[#5D0F17]/85 transition"
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
      <section className="border-t border-[#5D0F17]/10">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="text-xs text-[#5D0F17]/40">
            Each item checks out directly on the store&apos;s website.
            Shipping and returns are handled by each store.
          </p>
        </div>
      </section>
    </main>
  );
}
