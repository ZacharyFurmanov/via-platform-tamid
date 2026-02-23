"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type StoreCount = Record<string, number>;

type GenerateResult = {
  success?: boolean;
  saved?: number;
  created?: number;
  failed?: number;
  skipped?: number;
  errors?: { id: number; title: string; error: string }[];
  error?: string;
};

export default function CollabsLinksPage() {
  const [cookie, setCookie] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [missing, setMissing] = useState<{
    total: number;
    byStore: StoreCount;
    collabsStores: string[];
  } | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [progress, setProgress] = useState<{
    saved: number;
    created: number;
    failed: number;
    product?: string;
    store?: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  async function checkMissing() {
    setChecking(true);
    try {
      const res = await fetch("/api/admin/generate-collabs-links");
      if (res.ok) {
        const data = await res.json();
        setMissing(data);
      }
    } catch {
      // ignore
    }
    setChecking(false);
  }

  useEffect(() => {
    checkMissing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    if (!cookie.trim() || !csrfToken.trim()) {
      setResult({
        error: "Both the Cookie and CSRF Token fields are required.",
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setProgress(null);
    setLog([]);

    try {
      const body: Record<string, string> = {
        cookie: cookie.trim(),
        csrfToken: csrfToken.trim(),
      };
      if (storeSlug) body.storeSlug = storeSlug;

      const res = await fetch("/api/admin/generate-collabs-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setResult({ error: data.error || "Request failed" });
        setLoading(false);
        return;
      }

      // Read streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (data.type === "start") {
                setLog((prev) => [...prev, `Starting: ${data.stores} stores, ${data.missingInDb} products missing in DB`]);
              } else if (data.type === "store") {
                setStatusMessage(`Fetching products from ${data.store}...`);
                setLog((prev) => [...prev, `--- ${data.store} ---`]);
              } else if (data.type === "fetch_error") {
                setStatusMessage(`${data.store} ERROR: ${data.error}`);
                setLog((prev) => [...prev, `ERROR fetching ${data.store}: ${data.error}`]);
              } else if (data.type === "store_products") {
                const msg = `${data.store}: ${data.count} products in Collabs`;
                setStatusMessage(msg);
                setLog((prev) => [
                  ...prev,
                  msg,
                  ...(data.debug ? [
                    `  Collabs sample IDs: ${JSON.stringify(data.debug.collabsSampleIds)}`,
                    `  DB sample IDs: ${JSON.stringify(data.debug.dbSampleIds)}`,
                    `  Missing in DB: ${data.debug.missingCount}`,
                  ] : []),
                ]);
              } else if (data.type === "progress") {
                setProgress({
                  saved: data.saved,
                  created: data.created,
                  failed: data.failed,
                  product: data.product,
                  store: data.store,
                });
              } else if (data.type === "error") {
                setLog((prev) => [...prev, `FAILED: ${data.product} (${data.store}): ${data.error}`]);
              } else if (data.type === "done") {
                setResult(data);
                setProgress(null);
                setStatusMessage("");
                setLog((prev) => [...prev, `Done: saved=${data.saved} created=${data.created} failed=${data.failed} skipped=${data.skipped}`]);
                checkMissing();
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      }
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : "Request failed",
      });
    }

    setLoading(false);
  }

  const selectedCount = storeSlug
    ? missing?.byStore[storeSlug] || 0
    : missing?.total || 0;

  return (
    <main className="bg-white min-h-screen text-black">
      {/* Header */}
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <Link
                href="/admin/sync"
                className="text-neutral-400 hover:text-black transition-colors min-h-[44px] flex items-center"
              >
                Sync
              </Link>
              <span className="text-neutral-300">/</span>
              <span className="text-black">Collabs Links</span>
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
              <span className="text-neutral-300">/</span>
              <Link
                href="/admin/giveaway"
                className="text-neutral-400 hover:text-black transition-colors min-h-[44px] flex items-center"
              >
                Giveaway
              </Link>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-neutral-400 hover:text-black transition-colors"
            >
              Logout
            </button>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif mb-3 sm:mb-4">
            Collabs Links
          </h1>
          <p className="text-neutral-600 text-base sm:text-lg">
            Generate per-product affiliate links from Shopify Collabs. These
            links handle tracking and attribution automatically.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-6 sm:py-8">
          {checking ? (
            <p className="text-sm text-neutral-500">Checking products...</p>
          ) : missing ? (
            <div>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-3xl sm:text-4xl font-serif">
                  {missing.total}
                </span>
                <span className="text-neutral-500 text-sm">
                  products missing collabs links
                </span>
              </div>
              {missing.total > 0 && (
                <div className="flex flex-wrap gap-3">
                  {Object.entries(missing.byStore).map(([slug, count]) => (
                    <div
                      key={slug}
                      className="bg-neutral-50 border border-neutral-200 px-3 py-2 text-sm"
                    >
                      <span className="text-black font-medium">{slug}</span>
                      <span className="text-neutral-500 ml-2">{count}</span>
                    </div>
                  ))}
                </div>
              )}
              {missing.total === 0 && (
                <div className="bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                  All products have collabs links. Nothing to generate.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* Generate Form */}
      {missing && missing.total > 0 && (
        <section className="py-10 sm:py-16 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-xl sm:text-2xl font-serif mb-6">
              Generate Links
            </h2>

            <div className="space-y-6 max-w-2xl">
              {/* Instructions */}
              <div className="bg-neutral-50 border border-neutral-200 p-4 text-sm space-y-3">
                <p className="font-medium text-black">
                  How to get the credentials:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-neutral-600">
                  <li>
                    Go to{" "}
                    <a
                      href="https://collabs.shopify.com/collabs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      collabs.shopify.com/collabs
                    </a>
                  </li>
                  <li>
                    Open DevTools (Cmd+Option+I) &rarr;{" "}
                    <strong>Network</strong> tab
                  </li>
                  <li>Click on any store to trigger a request</li>
                  <li>
                    Click on any request to{" "}
                    <strong>collabs.shopify.com</strong>
                  </li>
                  <li>
                    In the <strong>Request Headers</strong>, copy the full{" "}
                    <strong>Cookie</strong> value
                  </li>
                  <li>
                    In the same headers, copy the{" "}
                    <strong>X-Csrf-Token</strong> value
                  </li>
                </ol>
              </div>

              {/* Cookie input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cookie
                </label>
                <textarea
                  value={cookie}
                  onChange={(e) => setCookie(e.target.value)}
                  placeholder="Paste the full Cookie header value from DevTools..."
                  rows={3}
                  className="w-full px-4 py-3 border border-neutral-200 text-sm outline-none focus:border-black transition-colors font-mono resize-y"
                />
              </div>

              {/* CSRF Token input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  X-Csrf-Token
                </label>
                <input
                  type="text"
                  value={csrfToken}
                  onChange={(e) => setCsrfToken(e.target.value)}
                  placeholder="Paste the X-Csrf-Token header value..."
                  className="w-full px-4 py-3 border border-neutral-200 text-sm outline-none focus:border-black transition-colors font-mono"
                />
              </div>

              {/* Optional store filter */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Store{" "}
                  <span className="text-neutral-400 font-normal">
                    (optional — leave blank for all stores)
                  </span>
                </label>
                <select
                  value={storeSlug}
                  onChange={(e) => setStoreSlug(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-200 text-sm outline-none focus:border-black transition-colors bg-white"
                >
                  <option value="">All stores</option>
                  {missing.collabsStores.map((slug) => (
                    <option key={slug} value={slug}>
                      {slug} ({missing.byStore[slug] || 0} missing)
                    </option>
                  ))}
                </select>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 min-h-[48px] bg-black text-white text-sm tracking-wide hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Generating..."
                  : `Generate Links (${selectedCount} products)`}
              </button>

              {/* Status message */}
              {statusMessage && (
                <p className="text-sm text-neutral-500">{statusMessage}</p>
              )}

              {/* Debug log */}
              {log.length > 0 && (
                <div className="bg-neutral-900 text-green-400 p-4 text-xs font-mono max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                  {log.map((entry, i) => (
                    <div key={i}>{entry}</div>
                  ))}
                </div>
              )}

              {/* Live progress */}
              {progress && (
                <div className="border border-neutral-200 p-4 text-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">
                      {progress.saved} saved
                      {progress.created > 0 && (
                        <span className="text-neutral-400 ml-1">
                          ({progress.created} newly created)
                        </span>
                      )}
                    </span>
                    {progress.failed > 0 && (
                      <span className="text-red-600">
                        {progress.failed} failed
                      </span>
                    )}
                  </div>
                  {progress.product && (
                    <p className="text-neutral-400 text-xs truncate">
                      {progress.store}: {progress.product}
                    </p>
                  )}
                </div>
              )}

              {/* Final result */}
              {result && (
                <div
                  className={`border p-4 text-sm ${
                    result.error
                      ? "border-red-200 bg-red-50"
                      : result.success
                        ? "border-green-200 bg-green-50"
                        : "border-amber-200 bg-amber-50"
                  }`}
                >
                  {result.error ? (
                    <p className="text-red-800">{result.error}</p>
                  ) : (
                    <div className="space-y-2">
                      <p
                        className={
                          result.success ? "text-green-800" : "text-amber-800"
                        }
                      >
                        Saved <strong>{result.saved}</strong> collabs links
                        {result.created
                          ? ` (${result.created} newly created)`
                          : ""}
                        {result.failed
                          ? ` — ${result.failed} failed`
                          : ""}
                      </p>
                      {result.errors && result.errors.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="font-medium text-red-800">
                            Failed products:
                          </p>
                          <div className="max-h-[200px] overflow-y-auto">
                            {result.errors.map((e) => (
                              <p key={e.id} className="text-red-700">
                                #{e.id} {e.title}: {e.error}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Admin Navigation */}
      <section className="border-t border-neutral-200 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
            <Link
              href="/admin/sync"
              className="text-neutral-500 hover:text-black transition-colors min-h-[44px] flex items-center"
            >
              Inventory Sync
            </Link>
            <span className="text-black min-h-[44px] flex items-center">
              Collabs Links
            </span>
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
            <Link
              href="/admin/giveaway"
              className="text-neutral-500 hover:text-black transition-colors min-h-[44px] flex items-center"
            >
              Giveaway
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
