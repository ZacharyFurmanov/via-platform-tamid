"use client";

import { useState } from "react";

type SquarespaceStore = {
  type: "squarespace";
  name: string;
  slug: string;
  rssUrl: string;
};

type ShopifyStore = {
  type: "shopify";
  name: string;
  slug: string;
  storeDomain: string;
  storefrontAccessToken: string;
};

type Store = SquarespaceStore | ShopifyStore;

type SyncResult = {
  success?: boolean;
  message?: string;
  productCount?: number;
  shopName?: string;
  error?: string;
  details?: string;
};

type StoreStatus = {
  loading: boolean;
  result: SyncResult | null;
};

// Squarespace stores (RSS-based)
const SQUARESPACE_STORES: SquarespaceStore[] = [
  {
    type: "squarespace",
    name: "LEI Vintage",
    slug: "lei-vintage",
    rssUrl: "https://www.leivintage.com/blog?format=rss",
  },
  {
    type: "squarespace",
    name: "Sourced by Scottie",
    slug: "sourced-by-scottie",
    rssUrl: "https://www.sourcedbyscottie.com/products?format=rss",
  },
  {
    type: "squarespace",
    name: "RE Park City",
    slug: "re-park-city",
    rssUrl: "https://www.re-parkcity.com/products?format=rss",
  },
];

// Shopify stores (Storefront API)
// Add your Shopify stores here with their storefront access tokens
const SHOPIFY_STORES: ShopifyStore[] = [
  // Example:
  // {
  //   type: "shopify",
  //   name: "My Shopify Store",
  //   slug: "my-shopify-store",
  //   storeDomain: "mystore.myshopify.com",
  //   storefrontAccessToken: "your-storefront-access-token",
  // },
];

const ALL_STORES: Store[] = [...SQUARESPACE_STORES, ...SHOPIFY_STORES];

export default function SyncAdminPage() {
  const [statuses, setStatuses] = useState<Record<string, StoreStatus>>({});

  async function handleSync(store: Store) {
    setStatuses((prev) => ({
      ...prev,
      [store.slug]: { loading: true, result: null },
    }));

    try {
      let response: Response;

      if (store.type === "squarespace") {
        response = await fetch("/api/sync-squarespace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeName: store.name, rssUrl: store.rssUrl }),
        });
      } else {
        response = await fetch("/api/sync-shopify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeName: store.name,
            storeDomain: store.storeDomain,
            storefrontAccessToken: store.storefrontAccessToken,
          }),
        });
      }

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
    for (const store of ALL_STORES) {
      await handleSync(store);
    }
  }

  return (
    <main className="bg-white min-h-screen text-black">
      {/* Header */}
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <h1 className="text-5xl font-serif mb-4">Inventory Sync</h1>
          <p className="text-neutral-600 text-lg">
            Sync products from Squarespace and Shopify partner stores.
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

      {/* Squarespace Stores */}
      {SQUARESPACE_STORES.length > 0 && (
        <section className="py-16 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-2xl font-serif mb-8">Squarespace Stores</h2>
            <div className="space-y-6">
              {SQUARESPACE_STORES.map((store) => {
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
                      <h3 className="text-xl font-serif mb-1">{store.name}</h3>
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
      )}

      {/* Shopify Stores */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-serif mb-8">Shopify Stores</h2>
          {SHOPIFY_STORES.length > 0 ? (
            <div className="space-y-6">
              {SHOPIFY_STORES.map((store) => {
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
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-serif">{store.name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                          Shopify
                        </span>
                      </div>
                      <p className="text-sm text-neutral-500 break-all">
                        {store.storeDomain}
                      </p>
                    </div>

                    {/* Result */}
                    {result && (
                      <div className="sm:text-right">
                        {result.success ? (
                          <p className="text-green-700 text-sm">
                            {result.productCount} products synced
                            {result.shopName && (
                              <span className="block text-neutral-500">
                                from {result.shopName}
                              </span>
                            )}
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
          ) : (
            <div className="border border-dashed border-neutral-300 p-8 text-center">
              <p className="text-neutral-500 mb-4">
                No Shopify stores configured yet.
              </p>
              <p className="text-sm text-neutral-400">
                Add stores in <code className="bg-neutral-100 px-1">app/admin/sync/page.tsx</code>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Help Section */}
      <section className="border-t border-neutral-200 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-lg font-serif mb-4">Squarespace Setup</h3>
              <div className="text-sm text-neutral-600 space-y-2">
                <p>
                  <span className="text-black">Products RSS:</span>{" "}
                  /products?format=rss
                </p>
                <p>
                  <span className="text-black">Blog RSS:</span>{" "}
                  /blog?format=rss
                </p>
                <p className="mt-4 text-neutral-500">
                  Squarespace stores use RSS feeds which are publicly accessible.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-serif mb-4">Shopify Setup</h3>
              <div className="text-sm text-neutral-600 space-y-3">
                <p>To get your Storefront Access Token:</p>
                <ol className="list-decimal list-inside space-y-1 text-neutral-500">
                  <li>Go to Shopify Admin → Settings</li>
                  <li>Click &quot;Apps and sales channels&quot;</li>
                  <li>Click &quot;Develop apps&quot; → Create an app</li>
                  <li>Configure Storefront API scopes</li>
                  <li>Install the app and copy the token</li>
                </ol>
                <p className="mt-4">
                  <span className="text-black">Required scopes:</span>{" "}
                  <code className="bg-neutral-100 px-1 text-xs">unauthenticated_read_product_listings</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
