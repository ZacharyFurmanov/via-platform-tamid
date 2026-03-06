"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";

type StoreInfo = {
  storeSlug: string;
  storeName: string;
  location: string;
  currency: string;
  website: string;
  logo: string;
  logoBg: string;
  commissionType: "shopify-collabs" | "squarespace-manual";
  totalInventoryValue: number;
  viaCommissionPotential: number;
};

type Analytics = {
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  topProducts: { name: string; count: number }[];
  range: string;
};

type SourcingRequest = {
  id: string;
  userEmail: string;
  userName: string | null;
  imageUrl: string | null;
  description: string;
  priceMin: number;
  priceMax: number;
  condition: string;
  size: string | null;
  deadline: string;
  createdAt: string;
  matchedStoreAt: string | null;
};

type SourcingData = {
  open: SourcingRequest[];
  mine: SourcingRequest[];
};

type RangeOption = "7d" | "30d" | "all";

export default function StoreDashboardPage() {
  const router = useRouter();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [sourcing, setSourcing] = useState<SourcingData | null>(null);
  const [range, setRange] = useState<RangeOption>("30d");
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimErrors, setClaimErrors] = useState<Record<string, string>>({});

  const fetchAnalytics = useCallback(async (r: RangeOption) => {
    const res = await fetch(`/api/store/analytics?range=${r}`);
    if (res.ok) {
      setAnalytics(await res.json());
    }
  }, []);

  useEffect(() => {
    async function init() {
      const [meRes, analyticsRes, sourcingRes] = await Promise.all([
        fetch("/api/store/me"),
        fetch(`/api/store/analytics?range=${range}`),
        fetch("/api/store/sourcing"),
      ]);

      if (!meRes.ok) {
        router.replace("/store/login");
        return;
      }

      const [storeData, analyticsData, sourcingData] = await Promise.all([
        meRes.json(),
        analyticsRes.ok ? analyticsRes.json() : null,
        sourcingRes.ok ? sourcingRes.json() : null,
      ]);

      setStore(storeData);
      setAnalytics(analyticsData);
      setSourcing(sourcingData);
      setLoadingInitial(false);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRangeChange(newRange: RangeOption) {
    setRange(newRange);
    await fetchAnalytics(newRange);
  }

  async function handleClaim(requestId: string) {
    setClaimingId(requestId);
    setClaimErrors((prev) => ({ ...prev, [requestId]: "" }));

    try {
      const res = await fetch(`/api/store/sourcing/${requestId}/claim`, {
        method: "POST",
      });

      if (res.ok) {
        // Refresh sourcing data
        const sourcingRes = await fetch("/api/store/sourcing");
        if (sourcingRes.ok) {
          setSourcing(await sourcingRes.json());
        }
      } else {
        const data = await res.json();
        setClaimErrors((prev) => ({
          ...prev,
          [requestId]: data.error || "Someone else just claimed this",
        }));
      }
    } catch {
      setClaimErrors((prev) => ({
        ...prev,
        [requestId]: "Something went wrong. Please try again.",
      }));
    } finally {
      setClaimingId(null);
    }
  }

  if (loadingInitial) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F7F3EA" }}
      >
        <p className="text-sm" style={{ color: "rgba(93,15,23,0.5)" }}>
          Loading…
        </p>
      </div>
    );
  }

  if (!store) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F7F3EA" }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: "#5D0F17", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-center gap-4">
          <Image
            src="/via-logo.png"
            alt="VIA"
            width={48}
            height={48}
            className="brightness-0 invert"
            style={{ objectFit: "contain" }}
          />
          <span className="text-sm uppercase tracking-widest text-white opacity-70">
            Store Partner Portal
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-sm text-white">
            {store.storeName}
            <span className="opacity-60 ml-2">· {store.location}</span>
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/store/login" })}
            className="text-xs uppercase tracking-wide text-white opacity-60 hover:opacity-100 transition-opacity"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* Revenue Potential */}
        {store.totalInventoryValue > 0 && (
          <section>
            <h2 className="text-lg font-serif uppercase tracking-wide mb-4" style={{ color: "#5D0F17" }}>
              Revenue Potential
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 shadow-sm text-center">
                <p className="text-3xl font-serif" style={{ color: "#5D0F17" }}>
                  ${store.totalInventoryValue.toLocaleString()}
                </p>
                <p className="text-xs uppercase tracking-wide mt-1" style={{ color: "rgba(93,15,23,0.5)" }}>
                  Total Listed Inventory
                </p>
              </div>
              <div className="bg-white p-6 shadow-sm text-center">
                <p className="text-3xl font-serif" style={{ color: "#5D0F17" }}>
                  ${store.viaCommissionPotential.toLocaleString()}
                </p>
                <p className="text-xs uppercase tracking-wide mt-1" style={{ color: "rgba(93,15,23,0.5)" }}>
                  VIA Commission (if sold)
                </p>
              </div>
              <div className="bg-white p-6 shadow-sm text-center">
                <p className="text-3xl font-serif" style={{ color: "#5D0F17" }}>
                  {store.commissionType === "shopify-collabs" ? "Automatic" : "Manual Invoice"}
                </p>
                <p className="text-xs uppercase tracking-wide mt-1" style={{ color: "rgba(93,15,23,0.5)" }}>
                  Payout Method
                </p>
                <p className="text-[10px] mt-1" style={{ color: "rgba(93,15,23,0.4)" }}>
                  {store.commissionType === "shopify-collabs" ? "Via Shopify Collabs" : "Via Squarespace Invoice"}
                </p>
              </div>
            </div>
            <p className="text-[11px] mt-3" style={{ color: "rgba(93,15,23,0.4)" }}>
              Commission rates: 7% under $1k · 5% $1k–$5k · 3% $5k+
            </p>
          </section>
        )}

        {/* Analytics Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-lg font-serif uppercase tracking-wide"
              style={{ color: "#5D0F17" }}
            >
              Your Analytics
            </h2>
            <div className="flex gap-1">
              {(["7d", "30d", "all"] as RangeOption[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRangeChange(r)}
                  className="px-3 py-1 text-xs uppercase tracking-wide transition-colors"
                  style={
                    range === r
                      ? { backgroundColor: "#5D0F17", color: "#F7F3EA" }
                      : { backgroundColor: "white", color: "#5D0F17", border: "1px solid #5D0F17" }
                  }
                >
                  {r === "all" ? "All time" : r}
                </button>
              ))}
            </div>
          </div>

          {analytics ? (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-6 shadow-sm text-center">
                  <p className="text-3xl font-serif" style={{ color: "#5D0F17" }}>
                    {analytics.totalClicks.toLocaleString()}
                  </p>
                  <p className="text-xs uppercase tracking-wide mt-1" style={{ color: "rgba(93,15,23,0.5)" }}>
                    Total Clicks
                  </p>
                </div>
                <div className="bg-white p-6 shadow-sm text-center">
                  <p className="text-3xl font-serif" style={{ color: "#5D0F17" }}>
                    {analytics.totalConversions.toLocaleString()}
                  </p>
                  <p className="text-xs uppercase tracking-wide mt-1" style={{ color: "rgba(93,15,23,0.5)" }}>
                    Conversions
                  </p>
                </div>
                <div className="bg-white p-6 shadow-sm text-center">
                  <p className="text-3xl font-serif" style={{ color: "#5D0F17" }}>
                    ${analytics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs uppercase tracking-wide mt-1" style={{ color: "rgba(93,15,23,0.5)" }}>
                    Revenue
                  </p>
                </div>
              </div>

              {analytics.topProducts.length > 0 && (
                <div className="bg-white shadow-sm">
                  <div
                    className="px-5 py-3 border-b text-xs uppercase tracking-wide"
                    style={{ color: "rgba(93,15,23,0.5)", borderColor: "#F7F3EA" }}
                  >
                    Top Products
                  </div>
                  <table className="w-full">
                    <tbody>
                      {analytics.topProducts.map((product, i) => (
                        <tr
                          key={i}
                          className="border-b last:border-0"
                          style={{ borderColor: "#F7F3EA" }}
                        >
                          <td className="px-5 py-3 text-sm" style={{ color: "#5D0F17" }}>
                            {product.name}
                          </td>
                          <td
                            className="px-5 py-3 text-sm text-right"
                            style={{ color: "rgba(93,15,23,0.5)" }}
                          >
                            {product.count} click{product.count !== 1 ? "s" : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm" style={{ color: "rgba(93,15,23,0.5)" }}>
              No analytics data available.
            </p>
          )}
        </section>

        {/* Open Sourcing Requests */}
        <section>
          <h2
            className="text-lg font-serif uppercase tracking-wide mb-2"
            style={{ color: "#5D0F17" }}
          >
            Open Sourcing Requests
            {sourcing && (
              <span
                className="ml-2 text-sm font-sans normal-case"
                style={{ color: "rgba(93,15,23,0.5)" }}
              >
                ({sourcing.open.length} available)
              </span>
            )}
          </h2>
          <p className="text-xs mb-6" style={{ color: "rgba(93,15,23,0.5)" }}>
            These are paid customer requests waiting to be matched with a store.
          </p>

          {!sourcing || sourcing.open.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(93,15,23,0.5)" }}>
              No open requests right now.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sourcing.open.map((req) => (
                <div key={req.id} className="bg-white shadow-sm p-5">
                  {req.imageUrl && (
                    <div className="mb-3 h-40 relative overflow-hidden bg-neutral-50">
                      <Image
                        src={req.imageUrl}
                        alt="Customer photo"
                        fill
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  )}
                  <p
                    className="text-sm mb-3 line-clamp-2"
                    style={{ color: "#5D0F17" }}
                  >
                    {req.description}
                  </p>
                  <div
                    className="text-xs space-y-1 mb-4"
                    style={{ color: "rgba(93,15,23,0.6)" }}
                  >
                    <p>
                      Budget: ${req.priceMin}–${req.priceMax}
                    </p>
                    <p>Condition: {req.condition}</p>
                    {req.size && <p>Size: {req.size}</p>}
                    <p>Deadline: {req.deadline}</p>
                  </div>

                  {claimErrors[req.id] && (
                    <p className="text-xs text-red-600 mb-2">{claimErrors[req.id]}</p>
                  )}

                  <button
                    onClick={() => handleClaim(req.id)}
                    disabled={claimingId === req.id}
                    className="w-full py-2 text-xs uppercase tracking-wide transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: "#5D0F17", color: "#F7F3EA" }}
                  >
                    {claimingId === req.id ? "Claiming…" : "I Can Fulfill This"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Your Active Requests */}
        <section>
          <h2
            className="text-lg font-serif uppercase tracking-wide mb-6"
            style={{ color: "#5D0F17" }}
          >
            Your Active Requests
            {sourcing && (
              <span
                className="ml-2 text-sm font-sans normal-case"
                style={{ color: "rgba(93,15,23,0.5)" }}
              >
                ({sourcing.mine.length})
              </span>
            )}
          </h2>

          {!sourcing || sourcing.mine.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(93,15,23,0.5)" }}>
              You haven&apos;t claimed any requests yet.
            </p>
          ) : (
            <div className="bg-white shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #F7F3EA" }}>
                    <th
                      className="px-5 py-3 text-left text-xs uppercase tracking-wide font-normal"
                      style={{ color: "rgba(93,15,23,0.5)" }}
                    >
                      Customer
                    </th>
                    <th
                      className="px-5 py-3 text-left text-xs uppercase tracking-wide font-normal"
                      style={{ color: "rgba(93,15,23,0.5)" }}
                    >
                      Description
                    </th>
                    <th
                      className="px-5 py-3 text-left text-xs uppercase tracking-wide font-normal"
                      style={{ color: "rgba(93,15,23,0.5)" }}
                    >
                      Budget
                    </th>
                    <th
                      className="px-5 py-3 text-left text-xs uppercase tracking-wide font-normal"
                      style={{ color: "rgba(93,15,23,0.5)" }}
                    >
                      Deadline
                    </th>
                    <th
                      className="px-5 py-3 text-left text-xs uppercase tracking-wide font-normal"
                      style={{ color: "rgba(93,15,23,0.5)" }}
                    >
                      Claimed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sourcing.mine.map((req) => (
                    <tr
                      key={req.id}
                      className="border-b last:border-0"
                      style={{ borderColor: "#F7F3EA" }}
                    >
                      <td className="px-5 py-3" style={{ color: "#5D0F17" }}>
                        <div>{req.userName || "—"}</div>
                        <div className="text-xs" style={{ color: "rgba(93,15,23,0.5)" }}>
                          {req.userEmail}
                        </div>
                      </td>
                      <td
                        className="px-5 py-3 max-w-xs"
                        style={{ color: "#5D0F17" }}
                      >
                        <p className="line-clamp-2">{req.description}</p>
                      </td>
                      <td
                        className="px-5 py-3 whitespace-nowrap"
                        style={{ color: "#5D0F17" }}
                      >
                        ${req.priceMin}–${req.priceMax}
                      </td>
                      <td className="px-5 py-3" style={{ color: "#5D0F17" }}>
                        {req.deadline}
                      </td>
                      <td
                        className="px-5 py-3 text-xs"
                        style={{ color: "rgba(93,15,23,0.5)" }}
                      >
                        {req.matchedStoreAt
                          ? new Date(req.matchedStoreAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
