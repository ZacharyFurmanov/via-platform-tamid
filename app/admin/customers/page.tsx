"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CustomerSummary = {
  userId: string;
  email: string | null;
  name: string | null;
  clickCount: number;
  purchaseCount: number;
  totalSpend: number;
  lastSeen: string;
  firstSeen: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<"purchases" | "clicks" | "spend">("purchases");

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then((d) => {
        setCustomers(d.customers ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load customers.");
        setLoading(false);
      });
  }, []);

  const sorted = [...customers].sort((a, b) => {
    if (sort === "purchases") return b.purchaseCount - a.purchaseCount;
    if (sort === "clicks") return b.clickCount - a.clickCount;
    return b.totalSpend - a.totalSpend;
  });

  const repeatBuyers = customers.filter((c) => c.purchaseCount > 1);
  const totalRevenue = customers.reduce((s, c) => s + c.totalSpend, 0);

  function fmt(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-[#F7F3EA] text-[#5D0F17] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-6 mb-10">
          <Link href="/admin/analytics" className="text-xs uppercase tracking-widest text-[#5D0F17]/50 hover:text-[#5D0F17] transition">
            ← Analytics
          </Link>
          <h1 className="text-2xl font-serif">Customer Behavior</h1>
        </div>

        {loading && <p className="text-sm text-[#5D0F17]/40">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {[
                { label: "Tracked Users", value: customers.length },
                { label: "Repeat Buyers", value: repeatBuyers.length },
                { label: "Confirmed Purchases", value: customers.reduce((s, c) => s + c.purchaseCount, 0) },
                { label: "Total Revenue", value: `$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
              ].map((stat) => (
                <div key={stat.label} className="border border-[#5D0F17]/15 p-5">
                  <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/40 mb-1">{stat.label}</p>
                  <p className="text-2xl font-serif">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Sort controls */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/40">Sort by:</span>
              {(["purchases", "clicks", "spend"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`text-xs uppercase tracking-[0.15em] px-3 py-1.5 border transition ${
                    sort === s
                      ? "border-[#5D0F17] bg-[#5D0F17] text-[#F7F3EA]"
                      : "border-[#5D0F17]/20 hover:border-[#5D0F17]"
                  }`}
                >
                  {s === "purchases" ? "Purchases" : s === "clicks" ? "Clicks" : "Spend"}
                </button>
              ))}
            </div>

            {/* Table */}
            {sorted.length === 0 ? (
              <div className="border border-[#5D0F17]/15 p-12 text-center">
                <p className="text-sm text-[#5D0F17]/40">No tracked users yet.</p>
                <p className="text-xs text-[#5D0F17]/30 mt-2">
                  User IDs are captured when logged-in users click &ldquo;Buy Now&rdquo;. Data will appear here once users browse while signed in.
                </p>
              </div>
            ) : (
              <div className="border border-[#5D0F17]/15 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#5D0F17]/10 bg-[#D8CABD]/20">
                      <th className="text-left px-5 py-3 text-xs uppercase tracking-[0.1em] text-[#5D0F17]/50 font-normal">User</th>
                      <th className="text-right px-5 py-3 text-xs uppercase tracking-[0.1em] text-[#5D0F17]/50 font-normal">Clicks</th>
                      <th className="text-right px-5 py-3 text-xs uppercase tracking-[0.1em] text-[#5D0F17]/50 font-normal">Purchases</th>
                      <th className="text-right px-5 py-3 text-xs uppercase tracking-[0.1em] text-[#5D0F17]/50 font-normal">Total Spend</th>
                      <th className="text-right px-5 py-3 text-xs uppercase tracking-[0.1em] text-[#5D0F17]/50 font-normal">First Seen</th>
                      <th className="text-right px-5 py-3 text-xs uppercase tracking-[0.1em] text-[#5D0F17]/50 font-normal">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((c, i) => (
                      <tr
                        key={c.userId}
                        className={`border-b border-[#5D0F17]/5 hover:bg-[#D8CABD]/10 transition ${
                          c.purchaseCount > 1 ? "bg-[#5D0F17]/[0.02]" : ""
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#5D0F17]/30 w-5 tabular-nums">{i + 1}</span>
                            <div>
                              <p className="font-medium text-sm">
                                {c.name || "—"}
                                {c.purchaseCount > 1 && (
                                  <span className="ml-2 text-[9px] uppercase tracking-widest bg-[#5D0F17] text-[#F7F3EA] px-1.5 py-0.5">
                                    Repeat
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-[#5D0F17]/40">{c.email || c.userId.slice(0, 12) + "…"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums">{c.clickCount}</td>
                        <td className="px-5 py-4 text-right tabular-nums font-medium">{c.purchaseCount}</td>
                        <td className="px-5 py-4 text-right tabular-nums">
                          {c.totalSpend > 0
                            ? `$${c.totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "—"}
                        </td>
                        <td className="px-5 py-4 text-right text-[#5D0F17]/50 text-xs">{fmt(c.firstSeen)}</td>
                        <td className="px-5 py-4 text-right text-[#5D0F17]/50 text-xs">{fmt(c.lastSeen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
