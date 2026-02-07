"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SquarespaceStore = {
  type: "squarespace";
  name: string;
  slug: string;
  shopUrl?: string;
  rssUrl?: string;
};

type ShopifyStore = {
  type: "shopify";
  name: string;
  slug: string;
  storeDomain: string;
  storefrontAccessToken?: string; // Optional - will try public endpoint first
};

type Store = SquarespaceStore | ShopifyStore;

type SyncResult = {
  success?: boolean;
  message?: string;
  productCount?: number;
  skippedCount?: number;
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
    shopUrl: "https://www.leivintage.com/shop",
  },
];

// Shopify stores (Storefront API)
// Add your Shopify stores here with their storefront access tokens
const SHOPIFY_STORES: ShopifyStore[] = [
  {
    type: "shopify",
    name: "Vintage Archives LA",
    slug: "vintage-archives-la",
    storeDomain: "vintagearchivesla.com",
  },
];

const ALL_STORES: Store[] = [...SQUARESPACE_STORES, ...SHOPIFY_STORES];

export default function SyncAdminPage() {
  const [statuses, setStatuses] = useState<Record<string, StoreStatus>>({});
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

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
          body: JSON.stringify({
            storeName: store.name,
            shopUrl: store.shopUrl,
            rssUrl: store.rssUrl,
          }),
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
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="text-black">Sync</span>
              <span className="text-neutral-300">/</span>
              <Link
                href="/admin/analytics"
                className="text-neutral-400 hover:text-black transition-colors min-h-[44px] flex items-center"
              >
                Analytics
              </Link>
              <span className="text-neutral-300">/</span>
              <Link
                href="/admin/emails"
                className="text-neutral-400 hover:text-black transition-colors min-h-[44px] flex items-center"
              >
                Emails
              </Link>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-neutral-400 hover:text-black transition-colors"
            >
              Logout
            </button>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif mb-3 sm:mb-4">Inventory Sync</h1>
          <p className="text-neutral-600 text-base sm:text-lg">
            Sync products from Squarespace and Shopify partner stores to the database.
          </p>
        </div>
      </section>

      {/* Sync All Button */}
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-4 sm:py-6 flex justify-center sm:justify-end">
          <button
            onClick={handleSyncAll}
            className="w-full sm:w-auto px-6 py-3 min-h-[48px] bg-black text-white text-sm tracking-wide hover:bg-neutral-800 transition-colors"
          >
            Sync All Stores
          </button>
        </div>
      </section>

      {/* Squarespace Stores */}
      {SQUARESPACE_STORES.length > 0 && (
        <section className="py-10 sm:py-16 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-xl sm:text-2xl font-serif mb-6 sm:mb-8">Squarespace Stores</h2>
            <div className="space-y-4 sm:space-y-6">
              {SQUARESPACE_STORES.map((store) => {
                const status = statuses[store.slug];
                const isLoading = status?.loading;
                const result = status?.result;

                return (
                  <div
                    key={store.slug}
                    className="border border-neutral-200 p-4 sm:p-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Store Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg sm:text-xl font-serif mb-1">{store.name}</h3>
                        <p className="text-xs sm:text-sm text-neutral-500 break-all">
                          {store.shopUrl || store.rssUrl}
                        </p>
                      </div>

                      {/* Sync Button */}
                      <button
                        onClick={() => handleSync(store)}
                        disabled={isLoading}
                        className="w-full sm:w-auto px-5 py-3 min-h-[48px] border border-black text-sm tracking-wide hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isLoading ? "Syncing..." : "Sync"}
                      </button>
                    </div>

                    {/* Result */}
                    {result && (
                      <div className="mt-3 pt-3 border-t border-neutral-100">
                        {result.success ? (
                          <div className="text-sm">
                            <p className="text-green-700">
                              {result.productCount} products synced
                            </p>
                            {result.skippedCount !== undefined && result.skippedCount > 0 && (
                              <p className="text-neutral-500 mt-1">
                                {result.skippedCount} skipped (sold out)
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-red-700 text-sm">
                            {result.error}
                            {result.details && (
                              <span className="block text-neutral-500 mt-1">
                                {result.details}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Shopify Stores */}
      <section className="py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-xl sm:text-2xl font-serif mb-6 sm:mb-8">Shopify Stores</h2>
          {SHOPIFY_STORES.length > 0 ? (
            <div className="space-y-4 sm:space-y-6">
              {SHOPIFY_STORES.map((store) => {
                const status = statuses[store.slug];
                const isLoading = status?.loading;
                const result = status?.result;

                return (
                  <div
                    key={store.slug}
                    className="border border-neutral-200 p-4 sm:p-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Store Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-lg sm:text-xl font-serif">{store.name}</h3>
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                            Shopify
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-neutral-500 break-all">
                          {store.storeDomain}
                        </p>
                      </div>

                      {/* Sync Button */}
                      <button
                        onClick={() => handleSync(store)}
                        disabled={isLoading}
                        className="w-full sm:w-auto px-5 py-3 min-h-[48px] border border-black text-sm tracking-wide hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isLoading ? "Syncing..." : "Sync"}
                      </button>
                    </div>

                    {/* Result */}
                    {result && (
                      <div className="mt-3 pt-3 border-t border-neutral-100">
                        {result.success ? (
                          <div className="text-sm">
                            <p className="text-green-700">
                              {result.productCount} products synced
                            </p>
                            {result.skippedCount !== undefined && result.skippedCount > 0 && (
                              <p className="text-neutral-500 mt-1">
                                {result.skippedCount} skipped (sold out)
                              </p>
                            )}
                            {result.shopName && (
                              <p className="text-neutral-500 mt-1">
                                from {result.shopName}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-red-700 text-sm">
                            {result.error}
                            {result.details && (
                              <span className="block text-neutral-500 mt-1">
                                {result.details}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-dashed border-neutral-300 p-6 sm:p-8 text-center">
              <p className="text-neutral-500 mb-3 sm:mb-4">
                No Shopify stores configured yet.
              </p>
              <p className="text-xs sm:text-sm text-neutral-400">
                Add stores in <code className="bg-neutral-100 px-1 text-xs">app/admin/sync/page.tsx</code>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Help Section */}
      <section className="border-t border-neutral-200 py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            <div>
              <h3 className="text-base sm:text-lg font-serif mb-3 sm:mb-4">Squarespace Setup</h3>
              <div className="text-sm text-neutral-600 space-y-2">
                <p>
                  <span className="text-black">Shop URL (recommended):</span>{" "}
                  <code className="text-xs bg-neutral-100 px-1">/shop</code>
                </p>
                <p>
                  <span className="text-black">RSS fallback:</span>{" "}
                  <code className="text-xs bg-neutral-100 px-1">/shop?format=rss</code>
                </p>
                <p className="mt-4 text-neutral-500">
                  Use the shop URL for stores with Squarespace Commerce (includes prices).
                  RSS is a fallback for stores with prices in descriptions.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-serif mb-3 sm:mb-4">Shopify Collabs Setup</h3>
              <div className="text-sm text-neutral-600 space-y-3">
                <p className="text-black font-medium">What to tell the store owner:</p>
                <ol className="list-decimal list-inside space-y-2 text-neutral-500 text-sm">
                  <li>Install the Shopify Collabs app from the Shopify App Store (free)</li>
                  <li>In Shopify Admin, go to Apps → Collabs → set up a Program with commission rates</li>
                  <li>Go to Recruiting → Invite Creator</li>
                  <li>Enter your email address</li>
                  <li>Attach the program offer to the invite and hit Send</li>
                </ol>
                <p className="text-black font-medium mt-5">After you get the invite:</p>
                <ol className="list-decimal list-inside space-y-2 text-neutral-500 text-sm">
                  <li>Accept the invite from your email or at <code className="bg-neutral-100 px-1 text-xs">collabs.shopify.com</code></li>
                  <li>Grab your unique affiliate link from the Collabs dashboard</li>
                  <li>Ask the store owner for their Storefront Access Token (see Storefront API steps) so VIA can sync their products</li>
                </ol>
                <p className="mt-4 text-neutral-400 text-xs">
                  Invites expire after 30 days. The brand only needs your email to invite you.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-serif mb-3 sm:mb-4">Shopify Storefront API</h3>
              <div className="text-sm text-neutral-600 space-y-3">
                <p>To sync products, get the store&apos;s Storefront Access Token:</p>
                <ol className="list-decimal list-inside space-y-1 text-neutral-500 text-sm">
                  <li>Go to Shopify Admin → Settings</li>
                  <li>Click &quot;Apps and sales channels&quot;</li>
                  <li>Click &quot;Develop apps&quot; → Create an app</li>
                  <li>Configure Storefront API scopes</li>
                  <li>Install the app and copy the token</li>
                </ol>
                <p className="mt-4">
                  <span className="text-black">Required scopes:</span>{" "}
                  <code className="bg-neutral-100 px-1 text-xs break-all">unauthenticated_read_product_listings</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Admin Navigation */}
      <section className="border-t border-neutral-200 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
            <span className="text-black min-h-[44px] flex items-center">Inventory Sync</span>
            <Link
              href="/admin/analytics"
              className="text-neutral-500 hover:text-black transition-colors min-h-[44px] flex items-center"
            >
              Analytics
            </Link>
            <Link
              href="/admin/emails"
              className="text-neutral-500 hover:text-black transition-colors min-h-[44px] flex items-center"
            >
              Emails
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
