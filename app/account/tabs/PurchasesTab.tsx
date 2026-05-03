"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/app/lib/formatPrice";

type ConversionItem = {
  productName: string;
  quantity: number;
  price: number;
};

type Purchase = {
  conversionId: string;
  timestamp: string;
  orderId: string;
  orderTotal: number;
  currency: string;
  items: ConversionItem[];
  storeName: string;
  storeSlug: string;
  returned?: boolean;
  matchedClickData?: { productName?: string };
};

export default function PurchasesTab() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account/purchases")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.purchases)) setPurchases(d.purchases); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-[#5D0F17]/5 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-serif text-lg mb-1">No purchases yet</p>
        <p className="text-sm text-[#5D0F17]/50 mb-6">Orders you place through VYA will appear here.</p>
        <Link href="/categories" className="inline-block bg-[#5D0F17] text-[#F7F3EA] px-6 py-3 text-xs uppercase tracking-[0.15em] hover:bg-[#5D0F17]/85 transition">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-[#5D0F17]/50 mb-5">{purchases.length} order{purchases.length !== 1 ? "s" : ""}</p>
      <div className="space-y-3">
        {purchases.map((p) => {
          const date = new Date(p.timestamp).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          });

          // Best item label: matchedClickData.productName → items[0].productName → storeName
          const itemNames = p.items?.length > 0
            ? p.items.map((i) => i.productName).filter(Boolean)
            : p.matchedClickData?.productName
              ? [p.matchedClickData.productName]
              : [];

          return (
            <div
              key={p.conversionId}
              className="border border-[#5D0F17]/10 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/stores/${p.storeSlug}`}
                    className="text-sm font-medium text-[#5D0F17] hover:underline truncate"
                  >
                    {p.storeName}
                  </Link>
                  {p.returned && (
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-[#5D0F17]/40 border border-[#5D0F17]/20 px-1.5 py-0.5">
                      Returned
                    </span>
                  )}
                </div>
                {itemNames.length > 0 && (
                  <p className="text-xs text-[#5D0F17]/60 truncate">
                    {itemNames.join(" · ")}
                  </p>
                )}
                <p className="text-xs text-[#5D0F17]/40 mt-1">{date}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium text-[#5D0F17]">
                  {formatPrice(p.orderTotal, p.currency)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
