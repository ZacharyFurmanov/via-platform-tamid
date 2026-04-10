"use client";

import Link from "next/link";
import type { SourcingRequest } from "@/app/lib/sourcing-db";

export default function SourcingTab({ requests }: { requests: SourcingRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto border border-[#5D0F17]/15 p-8">
          <p className="font-serif text-lg mb-1">Can&apos;t find what you&apos;re looking for?</p>
          <p className="text-sm text-[#5D0F17]/50 leading-relaxed mb-6">
            Submit a sourcing request and we&apos;ll find it from our network of stores within 21 business days.
          </p>
          <Link
            href="/account/sourcing"
            className="inline-block bg-[#5D0F17] text-[#F7F3EA] px-6 py-3 text-xs uppercase tracking-[0.15em] hover:bg-[#5D0F17]/85 transition"
          >
            Request Here
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-[#5D0F17]/50">{requests.length} {requests.length === 1 ? "request" : "requests"}</p>
        <Link href="/account/sourcing" className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 hover:text-[#5D0F17] transition">
          + New Request
        </Link>
      </div>

      {requests.map((req) => (
        <Link
          key={req.id}
          href={`/account/sourcing/${req.id}`}
          className="border border-[#5D0F17]/15 p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 hover:border-[#5D0F17] hover:bg-[#D8CABD]/10 transition"
        >
          <div className="flex gap-4">
            {req.imageUrl && (
              <img src={req.imageUrl} alt="" className="w-14 h-14 object-cover shrink-0 border border-[#5D0F17]/10" />
            )}
            <div>
              <p className="text-sm font-medium leading-snug line-clamp-2">{req.description}</p>
              <p className="text-xs text-[#5D0F17]/50 mt-1">
                ${req.priceMin}–${req.priceMax} &middot; {req.condition}
                {req.size ? ` · Size ${req.size}` : ""} &middot; by {req.deadline}
              </p>
              <p className="text-xs text-[#5D0F17]/30 mt-1">
                {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
          <span className={`shrink-0 self-start text-[9px] uppercase tracking-widest px-2 py-1 ${
            req.status === "matched" ? "bg-green-100 text-green-800"
            : req.status === "refunded" ? "bg-[#D8CABD]/50 text-[#5D0F17]/50"
            : "bg-[#5D0F17]/10 text-[#5D0F17]/70"
          }`}>
            {req.status === "paid" ? "Searching" : req.status === "pending_payment" ? "Payment Processing" : req.status}
          </span>
        </Link>
      ))}
    </div>
  );
}
