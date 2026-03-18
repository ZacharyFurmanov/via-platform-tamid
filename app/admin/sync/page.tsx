"use client";

import { useState } from "react";
import {
  SQUARESPACE_STORES,
  SHOPIFY_STORES,
  BIGCARTEL_STORES,
  ALL_STORES,
  type Store,
} from "@/app/lib/storeConfig";
import AdminNav from "@/app/components/AdminNav";

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
          body: JSON.stringify({
            storeName: store.name,
            shopUrl: store.shopUrl,
            rssUrl: store.rssUrl,
          }),
        });
      } else if (store.type === "bigcartel") {
        response = await fetch("/api/sync-bigcartel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeName: store.name,
            storeSlug: store.storeSlug,
          }),
        });
      } else {
        response = await fetch("/api/sync-shopify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeName: store.name,
            storeSlug: store.slug,
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
    <main style={{ background: "#F7F3EA", minHeight: "100vh" }}>
      <AdminNav />

      {/* Page title */}
      <section style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
          <h1 className="font-serif" style={{ fontSize: 28, color: "#5D0F17", marginBottom: 8 }}>
            Inventory Sync
          </h1>
          <p style={{ fontSize: 15, color: "rgba(93,15,23,0.6)" }}>
            Sync products from all connected stores.
          </p>
        </div>
      </section>

      {/* Sync All Button */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSyncAll}
          style={{ padding: "10px 24px", background: "#5D0F17", color: "#F7F3EA", border: "none", cursor: "pointer", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          Sync All Stores
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 48px" }}>

        {/* Squarespace Stores */}
        {SQUARESPACE_STORES.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 className="font-serif" style={{ fontSize: 18, color: "#5D0F17", marginBottom: 16 }}>Squarespace Stores</h2>
            {SQUARESPACE_STORES.map((store) => {
              const status = statuses[store.slug];
              const isLoading = status?.loading;
              const result = status?.result;

              return (
                <div
                  key={store.slug}
                  style={{ background: "#fff", border: "1px solid #e5e7eb", padding: 20, marginBottom: 12 }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="font-serif" style={{ fontSize: 17, color: "#5D0F17", marginBottom: 4 }}>{store.name}</h3>
                      <p style={{ fontSize: 12, color: "rgba(93,15,23,0.5)", wordBreak: "break-all" }}>
                        {store.shopUrl || store.rssUrl}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSync(store)}
                      disabled={isLoading}
                      style={{ padding: "8px 20px", background: "#5D0F17", color: "#F7F3EA", border: "none", cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.5 : 1, fontSize: 13, whiteSpace: "nowrap" }}
                    >
                      {isLoading ? "Syncing..." : "Sync"}
                    </button>
                  </div>
                  {result && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                      {result.success ? (
                        <div style={{ fontSize: 13 }}>
                          <p style={{ color: "#15803d" }}>{result.productCount} products synced</p>
                          {result.skippedCount !== undefined && result.skippedCount > 0 && (
                            <p style={{ color: "rgba(93,15,23,0.5)", marginTop: 4 }}>{result.skippedCount} skipped (sold out)</p>
                          )}
                        </div>
                      ) : (
                        <p style={{ color: "#b91c1c", fontSize: 13 }}>
                          {result.error}
                          {result.details && (
                            <span style={{ display: "block", color: "rgba(93,15,23,0.5)", marginTop: 4 }}>{result.details}</span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Big Cartel Stores */}
        {BIGCARTEL_STORES.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 className="font-serif" style={{ fontSize: 18, color: "#5D0F17", marginBottom: 16 }}>Big Cartel Stores</h2>
            {BIGCARTEL_STORES.map((store) => {
              const status = statuses[store.slug];
              const isLoading = status?.loading;
              const result = status?.result;

              return (
                <div key={store.slug} style={{ background: "#fff", border: "1px solid #e5e7eb", padding: 20, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <h3 className="font-serif" style={{ fontSize: 17, color: "#5D0F17" }}>{store.name}</h3>
                        <span style={{ fontSize: 10, padding: "2px 8px", background: "#dbeafe", color: "#1e40af" }}>Big Cartel</span>
                      </div>
                      <p style={{ fontSize: 12, color: "rgba(93,15,23,0.5)", wordBreak: "break-all" }}>
                        api.bigcartel.com/{store.storeSlug}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSync(store)}
                      disabled={isLoading}
                      style={{ padding: "8px 20px", background: "#5D0F17", color: "#F7F3EA", border: "none", cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.5 : 1, fontSize: 13, whiteSpace: "nowrap" }}
                    >
                      {isLoading ? "Syncing..." : "Sync"}
                    </button>
                  </div>
                  {result && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                      {result.success ? (
                        <div style={{ fontSize: 13 }}>
                          <p style={{ color: "#15803d" }}>{result.productCount} products synced</p>
                          {result.skippedCount !== undefined && result.skippedCount > 0 && (
                            <p style={{ color: "rgba(93,15,23,0.5)", marginTop: 4 }}>{result.skippedCount} skipped (sold out)</p>
                          )}
                        </div>
                      ) : (
                        <p style={{ color: "#b91c1c", fontSize: 13 }}>
                          {result.error}
                          {result.details && (
                            <span style={{ display: "block", color: "rgba(93,15,23,0.5)", marginTop: 4 }}>{result.details}</span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Shopify Stores */}
        <div style={{ marginBottom: 32 }}>
          <h2 className="font-serif" style={{ fontSize: 18, color: "#5D0F17", marginBottom: 16 }}>Shopify Stores</h2>
          {SHOPIFY_STORES.length > 0 ? (
            SHOPIFY_STORES.map((store) => {
              const status = statuses[store.slug];
              const isLoading = status?.loading;
              const result = status?.result;

              return (
                <div
                  key={store.slug}
                  style={{ background: "#fff", border: "1px solid #e5e7eb", padding: 20, marginBottom: 12 }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <h3 className="font-serif" style={{ fontSize: 17, color: "#5D0F17" }}>{store.name}</h3>
                        <span style={{ fontSize: 10, padding: "2px 8px", background: "#dcfce7", color: "#166534" }}>Shopify</span>
                      </div>
                      <p style={{ fontSize: 12, color: "rgba(93,15,23,0.5)", wordBreak: "break-all" }}>
                        {store.storeDomain}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSync(store)}
                      disabled={isLoading}
                      style={{ padding: "8px 20px", background: "#5D0F17", color: "#F7F3EA", border: "none", cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.5 : 1, fontSize: 13, whiteSpace: "nowrap" }}
                    >
                      {isLoading ? "Syncing..." : "Sync"}
                    </button>
                  </div>
                  {result && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                      {result.success ? (
                        <div style={{ fontSize: 13 }}>
                          <p style={{ color: "#15803d" }}>{result.productCount} products synced</p>
                          {result.skippedCount !== undefined && result.skippedCount > 0 && (
                            <p style={{ color: "rgba(93,15,23,0.5)", marginTop: 4 }}>{result.skippedCount} skipped (sold out)</p>
                          )}
                          {result.shopName && (
                            <p style={{ color: "rgba(93,15,23,0.5)", marginTop: 4 }}>from {result.shopName}</p>
                          )}
                        </div>
                      ) : (
                        <p style={{ color: "#b91c1c", fontSize: 13 }}>
                          {result.error}
                          {result.details && (
                            <span style={{ display: "block", color: "rgba(93,15,23,0.5)", marginTop: 4 }}>{result.details}</span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ background: "#fff", border: "1px dashed #e5e7eb", padding: "32px 24px", textAlign: "center" }}>
              <p style={{ color: "rgba(93,15,23,0.5)", marginBottom: 8 }}>No Shopify stores configured yet.</p>
              <p style={{ fontSize: 12, color: "rgba(93,15,23,0.4)" }}>
                Add stores in <code style={{ background: "#F7F3EA", padding: "1px 4px", fontSize: 11 }}>app/admin/sync/page.tsx</code>
              </p>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", padding: 24, marginTop: 32 }}>
          <h2 className="font-serif" style={{ fontSize: 18, color: "#5D0F17", marginBottom: 20 }}>Setup Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-serif" style={{ fontSize: 15, color: "#5D0F17", marginBottom: 12 }}>Squarespace Setup</h3>
              <div style={{ fontSize: 13, color: "rgba(93,15,23,0.7)", lineHeight: 1.6 }}>
                <p>
                  <span style={{ color: "#5D0F17" }}>Shop URL (recommended):</span>{" "}
                  <code style={{ fontSize: 11, background: "#F7F3EA", padding: "1px 4px" }}>/shop</code>
                </p>
                <p style={{ marginTop: 8 }}>
                  <span style={{ color: "#5D0F17" }}>RSS fallback:</span>{" "}
                  <code style={{ fontSize: 11, background: "#F7F3EA", padding: "1px 4px" }}>/shop?format=rss</code>
                </p>
                <p style={{ marginTop: 12, color: "rgba(93,15,23,0.5)" }}>
                  Use the shop URL for stores with Squarespace Commerce (includes prices).
                  RSS is a fallback for stores with prices in descriptions.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-serif" style={{ fontSize: 15, color: "#5D0F17", marginBottom: 12 }}>Shopify Collabs Setup</h3>
              <div style={{ fontSize: 13, color: "rgba(93,15,23,0.7)", lineHeight: 1.6 }}>
                <p style={{ color: "#5D0F17", fontWeight: 600 }}>What to tell the store owner:</p>
                <ol style={{ paddingLeft: 16, marginTop: 8, color: "rgba(93,15,23,0.6)" }}>
                  <li>Install the Shopify Collabs app from the Shopify App Store (free)</li>
                  <li style={{ marginTop: 4 }}>In Shopify Admin, go to Apps → Collabs → set up a Program with commission rates</li>
                  <li style={{ marginTop: 4 }}>Go to Recruiting → Invite Creator</li>
                  <li style={{ marginTop: 4 }}>Enter your email address</li>
                  <li style={{ marginTop: 4 }}>Attach the program offer to the invite and hit Send</li>
                </ol>
                <p style={{ color: "#5D0F17", fontWeight: 600, marginTop: 16 }}>After you get the invite:</p>
                <ol style={{ paddingLeft: 16, marginTop: 8, color: "rgba(93,15,23,0.6)" }}>
                  <li>Accept the invite from your email or at <code style={{ fontSize: 11, background: "#F7F3EA", padding: "1px 4px" }}>collabs.shopify.com</code></li>
                  <li style={{ marginTop: 4 }}>Grab your unique affiliate link from the Collabs dashboard</li>
                  <li style={{ marginTop: 4 }}>Ask the store owner for their Storefront Access Token (see Storefront API steps) so VYA can sync their products</li>
                </ol>
                <p style={{ marginTop: 12, fontSize: 11, color: "rgba(93,15,23,0.4)" }}>
                  Invites expire after 30 days. The brand only needs your email to invite you.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-serif" style={{ fontSize: 15, color: "#5D0F17", marginBottom: 12 }}>Shopify Storefront API</h3>
              <div style={{ fontSize: 13, color: "rgba(93,15,23,0.7)", lineHeight: 1.6 }}>
                <p>To sync products, get the store&apos;s Storefront Access Token:</p>
                <ol style={{ paddingLeft: 16, marginTop: 8, color: "rgba(93,15,23,0.6)" }}>
                  <li>Go to Shopify Admin → Settings</li>
                  <li style={{ marginTop: 4 }}>Click &quot;Apps and sales channels&quot;</li>
                  <li style={{ marginTop: 4 }}>Click &quot;Develop apps&quot; → Create an app</li>
                  <li style={{ marginTop: 4 }}>Configure Storefront API scopes</li>
                  <li style={{ marginTop: 4 }}>Install the app and copy the token</li>
                </ol>
                <p style={{ marginTop: 12 }}>
                  <span style={{ color: "#5D0F17" }}>Required scopes:</span>{" "}
                  <code style={{ fontSize: 11, background: "#F7F3EA", padding: "1px 4px", wordBreak: "break-all" }}>unauthenticated_read_product_listings</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
