"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ClickRecord = {
  clickId: string;
  timestamp: string;
  productId: string;
  productName: string;
  store: string;
  storeSlug: string;
  externalUrl: string;
  userAgent?: string;
};

type TopProduct = {
  id: string;
  name: string;
  store: string;
  count: number;
};

type AnalyticsData = {
  totalClicks: number;
  clicksByStore: Record<string, number>;
  topProducts: TopProduct[];
  recentClicks: ClickRecord[];
  range: string;
};

type DateRange = "7d" | "30d" | "all";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>("all");

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics?range=${range}`);
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [range]);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const maxStoreClicks = data
    ? Math.max(...Object.values(data.clicksByStore), 1)
    : 1;

  return (
    <main className="bg-white min-h-screen text-black">
      {/* Header */}
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/admin/sync"
              className="text-neutral-400 hover:text-black transition-colors"
            >
              Sync
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="text-black">Analytics</span>
          </div>
          <h1 className="text-5xl font-serif mb-4">Click Analytics</h1>
          <p className="text-neutral-600 text-lg">
            Track product clicks and store performance.
          </p>
        </div>
      </section>

      {/* Date Range Filter */}
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex gap-2">
            {(["7d", "30d", "all"] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-2 text-sm tracking-wide transition-colors ${
                  range === r
                    ? "bg-black text-white"
                    : "border border-neutral-200 hover:border-black"
                }`}
              >
                {r === "7d" ? "Last 7 days" : r === "30d" ? "Last 30 days" : "All time"}
              </button>
            ))}
          </div>
          {data && (
            <p className="text-sm text-neutral-500">
              {data.totalClicks.toLocaleString()} total clicks
            </p>
          )}
        </div>
      </section>

      {loading ? (
        <div className="max-w-7xl mx-auto px-6 py-16 text-center text-neutral-500">
          Loading analytics...
        </div>
      ) : !data || data.totalClicks === 0 ? (
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="border border-dashed border-neutral-300 p-8 text-center">
            <p className="text-neutral-500 mb-2">No click data yet.</p>
            <p className="text-sm text-neutral-400">
              Clicks will appear here once visitors start clicking products.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Clicks by Store */}
          <section className="py-16 border-b border-neutral-200">
            <div className="max-w-7xl mx-auto px-6">
              <h2 className="text-2xl font-serif mb-8">Clicks by Store</h2>
              <div className="space-y-4">
                {Object.entries(data.clicksByStore).map(([store, count]) => (
                  <div key={store} className="flex items-center gap-4">
                    <div className="w-40 text-sm truncate">{store}</div>
                    <div className="flex-1 h-8 bg-neutral-100 relative">
                      <div
                        className="h-full bg-black transition-all duration-300"
                        style={{ width: `${(count / maxStoreClicks) * 100}%` }}
                      />
                    </div>
                    <div className="w-16 text-right text-sm tabular-nums">
                      {count.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Top Products */}
          <section className="py-16 border-b border-neutral-200">
            <div className="max-w-7xl mx-auto px-6">
              <h2 className="text-2xl font-serif mb-8">Top 10 Products</h2>
              {data.topProducts.length > 0 ? (
                <div className="border border-neutral-200">
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-neutral-50 text-sm text-neutral-500 border-b border-neutral-200">
                    <div className="col-span-1">#</div>
                    <div className="col-span-6">Product</div>
                    <div className="col-span-3">Store</div>
                    <div className="col-span-2 text-right">Clicks</div>
                  </div>
                  {data.topProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
                    >
                      <div className="col-span-1 text-neutral-400">{index + 1}</div>
                      <div className="col-span-6 truncate">{product.name}</div>
                      <div className="col-span-3 text-sm text-neutral-500 truncate">
                        {product.store}
                      </div>
                      <div className="col-span-2 text-right tabular-nums font-medium">
                        {product.count.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500">No product clicks recorded.</p>
              )}
            </div>
          </section>

          {/* Recent Activity */}
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-6">
              <h2 className="text-2xl font-serif mb-8">Recent Activity</h2>
              {data.recentClicks.length > 0 ? (
                <div className="border border-neutral-200">
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-neutral-50 text-sm text-neutral-500 border-b border-neutral-200">
                    <div className="col-span-3">Time</div>
                    <div className="col-span-5">Product</div>
                    <div className="col-span-4">Store</div>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto">
                    {data.recentClicks.map((click) => (
                      <div
                        key={click.clickId}
                        className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50 text-sm"
                      >
                        <div className="col-span-3 text-neutral-500">
                          {formatDate(click.timestamp)}
                        </div>
                        <div className="col-span-5 truncate">{click.productName}</div>
                        <div className="col-span-4 text-neutral-500 truncate">
                          {click.store}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-neutral-500">No recent clicks.</p>
              )}
            </div>
          </section>
        </>
      )}

      {/* Admin Navigation */}
      <section className="border-t border-neutral-200 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6 text-sm">
            <Link
              href="/admin/sync"
              className="text-neutral-500 hover:text-black transition-colors"
            >
              Inventory Sync
            </Link>
            <span className="text-black">Analytics</span>
          </div>
        </div>
      </section>
    </main>
  );
}
