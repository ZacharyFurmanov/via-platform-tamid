"use client";

import { useState } from "react";

type Store = {
  name: string;
  slug: string;
  rssUrl: string;
};

type SyncResult = {
  success?: boolean;
  message?: string;
  productCount?: number;
  error?: string;
  details?: string;
};

type StoreStatus = {
  loading: boolean;
  result: SyncResult | null;
};

const STORES: Store[] = [
  {
    name: "LEI Vintage",
    slug: "lei-vintage",
    rssUrl: "https://www.leivintage.com/blog?format=rss",
  },
  {
    name: "Sourced by Scottie",
    slug: "sourced-by-scottie",
    rssUrl: "https://www.sourcedbyscottie.com/products?format=rss",
  },
  {
    name: "RE Park City",
    slug: "re-park-city",
    rssUrl: "https://www.re-parkcity.com/products?format=rss",
  },
];

export default function SyncAdminPage() {
  const [statuses, setStatuses] = useState<Record<string, StoreStatus>>({});

  async function handleSync(store: Store) {
    setStatuses((prev) => ({
      ...prev,
      [store.slug]: { loading: true, result: null },
    }));

    try {
      const response = await fetch("/api/sync-squarespace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName: store.name, rssUrl: store.rssUrl }),
      });

      const data = await response.json();
      setStatuses((prev) => ({
        ...prev,
        [store.slug]: { loading: false, result: data },
      }));
    } catch (error) {
      setStatuses((prev) => ({
        ...prev,
        [store.slug]: {
          loading: false,
          result: {
            error: "Request failed",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        },
      }));
    }
  }

  async function handleSyncAll() {
    for (const store of STORES) {
      await handleSync(store);
    }
  }

  return (
    <main className="bg-white min-h-screen text-black">
      {/* Header */}
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <h1 className="text-5xl font-serif mb-4">RSS Sync</h1>
          <p className="text-neutral-600 text-lg">
            Sync product feeds from partner stores.
          </p>
        </div>
      </section>

      {/* Sync All Button */}
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-end">
          <button
            onClick={handleSyncAll}
            className="px-6 py-3 bg-black text-white text-sm tracking-wide hover:bg-neutral-800 transition-colors"
          >
            Sync All Stores
          </button>
        </div>
      </section>

      {/* Store List */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="space-y-6">
            {STORES.map((store) => {
              const status = statuses[store.slug];
              const isLoading = status?.loading;
              const result = status?.result;

              return (
                <div
                  key={store.slug}
                  className="border border-neutral-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Store Info */}
                  <div className="flex-1">
                    <h2 className="text-xl font-serif mb-1">{store.name}</h2>
                    <p className="text-sm text-neutral-500 break-all">
                      {store.rssUrl}
                    </p>
                  </div>

                  {/* Result */}
                  {result && (
                    <div className="sm:text-right">
                      {result.success ? (
                        <p className="text-green-700 text-sm">
                          {result.productCount} products synced
                        </p>
                      ) : (
                        <p className="text-red-700 text-sm">
                          {result.error}
                          {result.details && (
                            <span className="block text-neutral-500">
                              {result.details}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Sync Button */}
                  <button
                    onClick={() => handleSync(store)}
                    disabled={isLoading}
                    className="px-5 py-2 border border-black text-sm tracking-wide hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isLoading ? "Syncing..." : "Sync"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="border-t border-neutral-200 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-lg font-serif mb-4">RSS Feed Formats</h3>
          <div className="text-sm text-neutral-600 space-y-2">
            <p>
              <span className="text-black">Squarespace Products:</span>{" "}
              /products?format=rss
            </p>
            <p>
              <span className="text-black">Squarespace Blog:</span>{" "}
              /blog?format=rss
            </p>
            <p>
              <span className="text-black">Shopify:</span> /blogs/news.atom
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
