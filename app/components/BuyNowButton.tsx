"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

type BuyNowButtonProps = {
  compositeId: string;
  title: string;
  price: string;
  image: string;
  storeName: string;
  storeSlug: string;
  externalUrl: string;
  checkoutUrl: string;
};

export default function BuyNowButton({
  compositeId,
  title,
  price,
  image,
  storeName,
  storeSlug,
  externalUrl,
  checkoutUrl,
}: BuyNowButtonProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  const trackUrl = (() => {
    const params = new URLSearchParams({
      pid: compositeId,
      pn: title,
      s: storeName,
      ss: storeSlug,
      url: checkoutUrl || externalUrl,
    });
    return `/api/track?${params.toString()}`;
  })();

  const openDrawer = () => {
    setOpen(true);
    requestAnimationFrame(() => setVisible(true));
  };

  const closeDrawer = useCallback(() => {
    setVisible(false);
    setTimeout(() => setOpen(false), 300);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeDrawer]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleCheckout = () => {
    // Open Shopify checkout in a centered popup window
    const w = 480, h = 700;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(
      trackUrl,
      "_blank",
      `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,location=0,status=0,scrollbars=1,resizable=1`
    );
    closeDrawer();
  };

  return (
    <>
      <button
        onClick={openDrawer}
        className="block w-full border border-[#5D0F17] text-[#5D0F17] py-4 text-sm uppercase tracking-wide text-center hover:bg-[#5D0F17]/5 transition mt-2"
      >
        Buy Now
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeDrawer}
          />

          {/* Drawer — slides up on mobile, slides in from right on desktop */}
          <div
            className={`relative w-full sm:w-[420px] sm:h-full max-h-[92vh] sm:max-h-full overflow-y-auto bg-[#F7F3EA] shadow-2xl transition-all duration-300 ease-out flex flex-col ${
              visible
                ? "opacity-100 translate-y-0 sm:translate-x-0"
                : "opacity-0 translate-y-10 sm:translate-y-0 sm:translate-x-10"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#5D0F17]/10">
              <img
                src="https://vyaplatform.com/vya-logo.png"
                alt="VYA"
                className="h-7 w-auto"
              />
              <button
                onClick={closeDrawer}
                className="text-[#5D0F17]/50 hover:text-[#5D0F17] transition p-1"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Product summary */}
            <div className="flex gap-4 px-6 py-5 border-b border-[#5D0F17]/10">
              {image && (
                <div className="w-20 h-24 flex-shrink-0 overflow-hidden bg-neutral-100">
                  <img
                    src={image}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex flex-col justify-center min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#5D0F17]/50 mb-1">
                  {storeName}
                </p>
                <h3 className="font-serif text-base text-[#5D0F17] leading-snug line-clamp-2 mb-2">
                  {title}
                </h3>
                <p className="text-lg font-medium text-[#5D0F17]">{price}</p>
              </div>
            </div>

            {/* Body copy */}
            <div className="px-6 py-6 flex-1">
              <p className="text-sm text-[#5D0F17]/70 leading-relaxed mb-1">
                You&apos;re checking out from{" "}
                <span className="font-medium text-[#5D0F17]">{storeName}</span>.
              </p>
              <p className="text-sm text-[#5D0F17]/70 leading-relaxed">
                Your purchase directly supports an independent vintage seller.
                Payment and shipping are handled by the store.
              </p>

              <div className="mt-6 space-y-1 text-xs text-[#5D0F17]/40">
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Secure checkout powered by Shopify</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>All major cards, Shop Pay, and more</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Curated and verified by VYA</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="px-6 pb-8 pt-2">
              <button
                onClick={handleCheckout}
                className="block w-full bg-[#5D0F17] text-[#F7F3EA] py-4 text-sm uppercase tracking-wide text-center hover:bg-[#5D0F17]/85 transition"
              >
                Continue to Checkout
              </button>
              <p className="text-[10px] text-[#5D0F17]/40 text-center mt-3">
                Opens {storeName}&apos;s checkout in a new window.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
