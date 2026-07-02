"use client";

// Hands the buyer to the VYA checkout page, which collects their address + a live
// shipping rate (when the store charges for shipping) before the Stripe session.
export default function BuyButton({ itemId, accent }: { itemId: string; accent: string }) {
 return (
 <a
 href={`/checkout?item=${itemId}`}
 className="mt-2 block w-full rounded-[2px] py-1.5 text-center text-[11px] uppercase tracking-[0.16em] text-white transition hover:opacity-90"
 style={{ background: accent }}
 >
 Buy
 </a>
 );
}
