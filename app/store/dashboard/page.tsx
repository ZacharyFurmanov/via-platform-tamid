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
  storeFollowers: number;
  topFavoritedProducts: { title: string; price: number; favoriteCount: number }[];
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

type SourcingOffer = {
  id: string;
  requestId: string;
  storeName: string;
  fee: number;
  timeline: string;
  notes: string | null;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

type SourcingData = {
  open: SourcingRequest[];
  mine: SourcingRequest[];
  myOffers: SourcingOffer[];
};

type OfferForm = {
  fee: string;
  timeline: string;
  notes: string;
};

type RangeOption = "7d" | "30d" | "all";

/** Tiered commission VYA earns on a given revenue total. */
function calcViaCommission(revenue: number): number {
  if (revenue <= 0) return 0;
  if (revenue <= 1000) return revenue * 0.07;
  if (revenue <= 5000) return 1000 * 0.07 + (revenue - 1000) * 0.05;
  return 1000 * 0.07 + 4000 * 0.05 + (revenue - 5000) * 0.03;
}

export default function StoreDashboardPage() {
  const router = useRouter();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [sourcing, setSourcing] = useState<SourcingData | null>(null);
  const [range, setRange] = useState<RangeOption>("30d");
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [offerFormOpen, setOfferFormOpen] = useState<string | null>(null);
  const [offerForms, setOfferForms] = useState<Record<string, OfferForm>>({});
  const [submittingOffer, setSubmittingOffer] = useState<string | null>(null);
  const [offerErrors, setOfferErrors] = useState<Record<string, string>>({});
  const [offerSuccess, setOfferSuccess] = useState<Record<string, boolean>>({});

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

      setStore({
        storeFollowers: 0,
        topFavoritedProducts: [],
        ...storeData,
      });
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

  function getOfferForm(requestId: string): OfferForm {
    return offerForms[requestId] ?? { fee: "", timeline: "", notes: "" };
  }

  function updateOfferForm(requestId: string, patch: Partial<OfferForm>) {
    setOfferForms((prev) => ({
      ...prev,
      [requestId]: { ...getOfferForm(requestId), ...patch },
    }));
  }

  async function handleSubmitOffer(requestId: string) {
    const form = getOfferForm(requestId);
    if (!form.fee || Number(form.fee) <= 0) {
      setOfferErrors((prev) => ({ ...prev, [requestId]: "Please enter a sourcing fee." }));
      return;
    }
    if (!form.timeline.trim()) {
      setOfferErrors((prev) => ({ ...prev, [requestId]: "Please enter an estimated timeline." }));
      return;
    }

    setSubmittingOffer(requestId);
    setOfferErrors((prev) => ({ ...prev, [requestId]: "" }));

    try {
      const res = await fetch(`/api/store/sourcing/${requestId}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fee: Number(form.fee),
          timeline: form.timeline.trim(),
          notes: form.notes.trim() || null,
        }),
      });

      if (res.ok) {
        setOfferSuccess((prev) => ({ ...prev, [requestId]: true }));
        setOfferFormOpen(null);
        const sourcingRes = await fetch("/api/store/sourcing");
        if (sourcingRes.ok) setSourcing(await sourcingRes.json());
      } else {
        const data = await res.json();
        setOfferErrors((prev) => ({
          ...prev,
          [requestId]: data.error || "Failed to submit offer.",
        }));
      }
    } catch {
      setOfferErrors((prev) => ({
        ...prev,
        [requestId]: "Something went wrong. Please try again.",
      }));
    } finally {
      setSubmittingOffer(null);
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
            src="/vya-logo.png"
            alt="VYA"
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
                  VYA Commission (if sold)
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

        {/* Followers & Liked Products */}
        <section>
          <h2 className="text-lg font-serif uppercase tracking-wide mb-4" style={{ color: "#5D0F17" }}>
            Your Audience
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-6 shadow-sm text-center">
              <p className="text-3xl font-serif" style={{ color: "#5D0F17" }}>
                {store.storeFollowers.toLocaleString()}
              </p>
              <p className="text-xs uppercase tracking-wide mt-1" style={{ color: "rgba(93,15,23,0.5)" }}>
                Store Followers
              </p>
              <p className="text-[10px] mt-1" style={{ color: "rgba(93,15,23,0.4)" }}>
                Users who have saved your store
              </p>
            </div>
            <div className="bg-white p-6 shadow-sm text-center">
              <p className="text-3xl font-serif" style={{ color: "#5D0F17" }}>
                {store.topFavoritedProducts.reduce((sum, p) => sum + p.favoriteCount, 0).toLocaleString()}
              </p>
              <p className="text-xs uppercase tracking-wide mt-1" style={{ color: "rgba(93,15,23,0.5)" }}>
                Total Product Likes
              </p>
              <p className="text-[10px] mt-1" style={{ color: "rgba(93,15,23,0.4)" }}>
                Across all listed products
              </p>
            </div>
            <div className="bg-white p-6 shadow-sm text-center">
              <p className="text-3xl font-serif" style={{ color: "#5D0F17" }}>
                {store.topFavoritedProducts.length > 0 ? store.topFavoritedProducts[0].favoriteCount : 0}
              </p>
              <p className="text-xs uppercase tracking-wide mt-1" style={{ color: "rgba(93,15,23,0.5)" }}>
                Most Liked Product
              </p>
              {store.topFavoritedProducts.length > 0 && (
                <p className="text-[10px] mt-1 truncate px-2" style={{ color: "rgba(93,15,23,0.4)" }}>
                  {store.topFavoritedProducts[0].title}
                </p>
              )}
            </div>
          </div>

          {store.topFavoritedProducts.length > 0 && (
            <div className="bg-white shadow-sm">
              <div
                className="px-5 py-3 border-b text-xs uppercase tracking-wide"
                style={{ color: "rgba(93,15,23,0.5)", borderColor: "#F7F3EA" }}
              >
                Most Liked Products
              </div>
              <table className="w-full">
                <tbody>
                  {store.topFavoritedProducts.map((product, i) => (
                    <tr key={i} className="border-b last:border-0" style={{ borderColor: "#F7F3EA" }}>
                      <td className="px-5 py-3 text-sm" style={{ color: "#5D0F17" }}>
                        {product.title}
                      </td>
                      <td className="px-5 py-3 text-sm text-right whitespace-nowrap" style={{ color: "rgba(93,15,23,0.5)" }}>
                        ${product.price}
                      </td>
                      <td className="px-5 py-3 text-sm text-right whitespace-nowrap" style={{ color: "rgba(93,15,23,0.5)" }}>
                        ♥ {product.favoriteCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
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
                <div className="bg-white p-6 shadow-sm text-center">
                  <p className="text-3xl font-serif" style={{ color: "#5D0F17" }}>
                    ${Math.round(calcViaCommission(analytics.totalRevenue)).toLocaleString()}
                  </p>
                  <p className="text-xs uppercase tracking-wide mt-1" style={{ color: "rgba(93,15,23,0.5)" }}>
                    VYA Commission
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: "rgba(93,15,23,0.35)" }}>
                    7% · 5% · 3% tiered
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
            Paid customer requests open for offers. Submit your sourcing fee, timeline, and any notes — the customer will choose which offer to accept.
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

                  {/* Offer already submitted */}
                  {(sourcing?.myOffers ?? []).some((o) => o.requestId === req.id) ? (
                    <div className="text-xs py-2 text-center" style={{ color: "rgba(93,15,23,0.5)", border: "1px solid rgba(93,15,23,0.15)" }}>
                      {(sourcing?.myOffers ?? []).find((o) => o.requestId === req.id)?.status === "accepted"
                        ? "✓ Offer Accepted"
                        : (sourcing?.myOffers ?? []).find((o) => o.requestId === req.id)?.status === "declined"
                        ? "Offer Declined"
                        : "✓ Offer Submitted — Awaiting Customer"}
                    </div>
                  ) : offerSuccess[req.id] ? (
                    <div className="text-xs py-2 text-center" style={{ color: "rgba(93,15,23,0.5)", border: "1px solid rgba(93,15,23,0.15)" }}>
                      ✓ Offer Submitted — Awaiting Customer
                    </div>
                  ) : offerFormOpen === req.id ? (
                    <div className="border border-[#5D0F17]/15 p-4 space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(93,15,23,0.5)" }}>
                          Sourcing Fee (USD) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(93,15,23,0.4)" }}>$</span>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            placeholder="e.g. 25"
                            value={getOfferForm(req.id).fee}
                            onChange={(e) => updateOfferForm(req.id, { fee: e.target.value })}
                            className="w-full border border-[#5D0F17]/20 bg-transparent pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-[#5D0F17] transition"
                            style={{ color: "#5D0F17" }}
                          />
                        </div>
                        <p className="text-[10px] mt-1" style={{ color: "rgba(93,15,23,0.4)" }}>
                          This is charged on top of the item price, paid by the customer when they accept.
                        </p>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(93,15,23,0.5)" }}>
                          Timeline *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 3–5 business days"
                          value={getOfferForm(req.id).timeline}
                          onChange={(e) => updateOfferForm(req.id, { timeline: e.target.value })}
                          className="w-full border border-[#5D0F17]/20 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[#5D0F17] transition"
                          style={{ color: "#5D0F17" }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(93,15,23,0.5)" }}>
                          Notes <span className="normal-case tracking-normal" style={{ color: "rgba(93,15,23,0.3)" }}>(optional)</span>
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Anything the customer should know — condition, provenance, etc."
                          value={getOfferForm(req.id).notes}
                          onChange={(e) => updateOfferForm(req.id, { notes: e.target.value })}
                          className="w-full border border-[#5D0F17]/20 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[#5D0F17] resize-none transition"
                          style={{ color: "#5D0F17" }}
                        />
                      </div>

                      {offerErrors[req.id] && (
                        <p className="text-xs text-red-600">{offerErrors[req.id]}</p>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSubmitOffer(req.id)}
                          disabled={submittingOffer === req.id}
                          className="flex-1 py-2 text-xs uppercase tracking-wide transition-opacity disabled:opacity-50"
                          style={{ backgroundColor: "#5D0F17", color: "#F7F3EA" }}
                        >
                          {submittingOffer === req.id ? "Submitting…" : "Submit Offer"}
                        </button>
                        <button
                          onClick={() => setOfferFormOpen(null)}
                          className="px-4 py-2 text-xs uppercase tracking-wide border"
                          style={{ borderColor: "rgba(93,15,23,0.2)", color: "#5D0F17" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setOfferFormOpen(req.id)}
                      className="w-full py-2 text-xs uppercase tracking-wide border transition-colors hover:bg-[#5D0F17] hover:text-[#F7F3EA]"
                      style={{ borderColor: "#5D0F17", color: "#5D0F17" }}
                    >
                      Submit an Offer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Your Submitted Offers */}
        <section>
          <h2
            className="text-lg font-serif uppercase tracking-wide mb-2"
            style={{ color: "#5D0F17" }}
          >
            Your Submitted Offers
            {sourcing && (
              <span
                className="ml-2 text-sm font-sans normal-case"
                style={{ color: "rgba(93,15,23,0.5)" }}
              >
                ({sourcing.myOffers?.length ?? 0})
              </span>
            )}
          </h2>
          <p className="text-xs mb-6" style={{ color: "rgba(93,15,23,0.5)" }}>
            Offers you&apos;ve submitted to customers. Accepted offers mean the customer has chosen you.
          </p>

          {!sourcing || !sourcing.myOffers?.length ? (
            <p className="text-sm" style={{ color: "rgba(93,15,23,0.5)" }}>
              You haven&apos;t submitted any offers yet.
            </p>
          ) : (
            <div className="bg-white shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #F7F3EA" }}>
                    {["Request", "Fee", "Timeline", "Status", "Submitted"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs uppercase tracking-wide font-normal"
                        style={{ color: "rgba(93,15,23,0.5)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sourcing.myOffers.map((offer) => (
                    <tr key={offer.id} className="border-b last:border-0" style={{ borderColor: "#F7F3EA" }}>
                      <td className="px-5 py-3 max-w-xs" style={{ color: "#5D0F17" }}>
                        <p className="line-clamp-2 text-xs" style={{ color: "rgba(93,15,23,0.6)" }}>
                          {offer.requestId}
                        </p>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap" style={{ color: "#5D0F17" }}>
                        ${offer.fee}
                      </td>
                      <td className="px-5 py-3" style={{ color: "#5D0F17" }}>
                        {offer.timeline}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="text-[10px] uppercase tracking-widest px-2 py-1"
                          style={
                            offer.status === "accepted"
                              ? { background: "#dcfce7", color: "#166534" }
                              : offer.status === "declined"
                              ? { background: "rgba(93,15,23,0.06)", color: "rgba(93,15,23,0.4)" }
                              : { background: "rgba(93,15,23,0.08)", color: "#5D0F17" }
                          }
                        >
                          {offer.status === "accepted" ? "Accepted" : offer.status === "declined" ? "Declined" : "Pending"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: "rgba(93,15,23,0.5)" }}>
                        {new Date(offer.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* Partner Feedback */}
        <section className="border-t pt-10" style={{ borderColor: "rgba(93,15,23,0.1)" }}>
          <h2 className="text-lg font-serif uppercase tracking-wide mb-2" style={{ color: "#5D0F17" }}>
            Share Feedback
          </h2>
          <p className="text-xs mb-4" style={{ color: "rgba(93,15,23,0.5)" }}>
            Help us improve VYA for our store partners. All responses are anonymous.
          </p>
          <a
            href="https://form.typeform.com/to/L13186Wp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 text-xs uppercase tracking-wide transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#5D0F17", color: "#F7F3EA" }}
          >
            Give Anonymous Feedback
          </a>
        </section>
      </main>
    </div>
  );
}
