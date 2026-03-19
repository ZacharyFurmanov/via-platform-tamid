"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminNav from "@/app/components/AdminNav";

// ── Types ─────────────────────────────────────────────────────────────────────

type DateRange = "7d" | "30d" | "all";

type KPIs = {
  totalClicks: number;
  totalViews: number;
  totalRevenue: number;
  totalConversions: number;
  matchedConversions: number;
  unmatchedConversions: number;
  totalCustomers: number;
  approvedCustomers: number;
  pilotTotal: number;
  waitlistOnly: number;
  newSignupsThisWeek: number;
  collabsTotalOrders?: number;
  collabsEstimatedRevenue?: number;
};

type ConversionRow = {
  conversionId: string;
  timestamp: string;
  orderId: string;
  orderTotal: number;
  storeSlug: string;
  storeName: string;
  matched: boolean;
  viaClickId: string | null;
  clickedProduct: string | null;
  userId: string | null;
  buyerEmail: string | null;
  buyerName: string | null;
};

type TopProduct = {
  productId: string;
  name: string | null;
  store: string | null;
  clicks?: number;
  views?: number;
};

type TopStore = {
  store: string;
  clicks: number;
  conversions: number;
  revenue: number;
};

type SignupDay = {
  date: string;
  count: number;
};

type ReferralEntry = {
  name: string;
  email: string;
  code: string;
  referralCount: number;
};

type ActivityItem = {
  type: "click";
  timestamp: string;
  productName: string | null;
  store: string | null;
  productId: string | null;
};

type InventoryStoreRow = {
  storeSlug: string;
  productCount: number;
  inventoryValue: number;
  potentialCommission: number;
};

type InventoryStats = {
  productCount: number;
  inventoryValue: number;
  potentialCommission: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  byStore: InventoryStoreRow[];
};

type AnalyticsData = {
  kpis: KPIs;
  topProductsByClicks: TopProduct[];
  topProductsByViews: TopProduct[];
  topStores: TopStore[];
  signupsByDay: SignupDay[];
  referralLeaderboard: ReferralEntry[];
  recentActivity: ActivityItem[];
  recentConversions: ConversionRow[];
  inventory: InventoryStats;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRevenue(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRevenueShort(n: number): string {
  if (n === 0) return "—";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function dayLabel(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const parts = dateStr.split("-");
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[month - 1]} ${day}`;
}

// ── Colour tokens ─────────────────────────────────────────────────────────────

const MAROON = "#5D0F17";
const CREAM = "#F7F3EA";

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{ backgroundColor: CREAM, borderRadius: 8, padding: "16px 20px", minWidth: 120, flex: "1 1 140px" }}
    >
      <p style={{ fontSize: 11, color: MAROON, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
        {label}
      </p>
      <p style={{ fontSize: 24, fontWeight: 700, color: MAROON, margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 10, color: MAROON, opacity: 0.4, margin: "4px 0 0" }}>{sub}</p>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 13, fontWeight: 700, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 14px" }}>
      {children}
    </h2>
  );
}

function RangeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 14px",
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 4,
        border: `1.5px solid ${MAROON}`,
        backgroundColor: active ? MAROON : "white",
        color: active ? "white" : MAROON,
        cursor: "pointer",
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "overview" | "inventory" | "collabs";

type CollabsPartnership = {
  id: string;
  name: string;
  logoUrl: string | null;
  totalCommissionEarned: string;
  currency: string;
  totalLinkVisits: number;
  totalOrders: number;
};

export default function DeepAnalyticsPage() {
  const [range, setRange] = useState<DateRange>("30d");
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (r: DateRange, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics-deep?range=${r}&t=${Date.now()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  // Auto-refresh every 30 seconds (silent — no loading spinner)
  useEffect(() => {
    const interval = setInterval(() => fetchData(range, true), 30_000);
    return () => clearInterval(interval);
  }, [range, fetchData]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", backgroundColor: CREAM, color: MAROON, fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <AdminNav />

      {/* Page title + tabs + range picker */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: MAROON }}>Analytics</h1>
          <div style={{ display: "flex", gap: 8 }}>
            {(["7d", "30d", "all"] as DateRange[]).map((r) => (
              <RangeButton key={r} label={r.toUpperCase()} active={range === r} onClick={() => setRange(r)} />
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", gap: 0 }}>
          {(["overview", "inventory", "collabs"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "12px 20px",
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                borderBottom: tab === t ? `2px solid ${MAROON}` : "2px solid transparent",
                background: "transparent",
                color: tab === t ? MAROON : `${MAROON}88`,
                cursor: "pointer",
                textTransform: "capitalize",
                letterSpacing: "0.04em",
              }}
            >
              {t === "inventory" ? "Inventory" : t === "collabs" ? "Shopify Collabs" : "Overview"}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: "28px 24px", maxWidth: 1280, margin: "0 auto" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", opacity: 0.5, fontSize: 14 }}>
            Loading analytics…
          </div>
        )}

        {error && (
          <div style={{ padding: 16, backgroundColor: "#fef2f2", borderRadius: 8, color: "#b91c1c", fontSize: 13 }}>
            Error: {error}
          </div>
        )}

        {tab === "collabs" && <CollabsTab />}

        {!loading && !error && data && tab === "inventory" && (
          <InventoryTab inv={data.inventory} />
        )}

        {!loading && !error && data && tab === "overview" && (
          <>
            {/* ── KPI Bar ─────────────────────────────────────────────────── */}
            {/* Signups group */}
            <p style={{ fontSize: 11, fontWeight: 700, color: MAROON, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Signups</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
              <StatCard label="Total (all sources)" value={data.kpis.totalCustomers.toLocaleString()} />
              <StatCard label="Pilot Users" value={data.kpis.pilotTotal.toLocaleString()} />
              <StatCard label="Approved" value={data.kpis.approvedCustomers.toLocaleString()} />
              <StatCard label="Waitlist Only" value={data.kpis.waitlistOnly.toLocaleString()} />
              <StatCard label="New This Week" value={data.kpis.newSignupsThisWeek.toLocaleString()} />
            </div>
            {/* Activity group */}
            <p style={{ fontSize: 11, fontWeight: 700, color: MAROON, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Activity</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 36 }}>
              <StatCard label="Total Clicks" value={data.kpis.totalClicks.toLocaleString()} />
              <StatCard label="Product Views" value={data.kpis.totalViews.toLocaleString()} />
              <StatCard
                label="Orders"
                value={data.kpis.totalConversions.toLocaleString()}
                sub={data.kpis.collabsTotalOrders ? `${data.kpis.collabsTotalOrders} via Shopify Collabs` : undefined}
              />
              <StatCard
                label="Revenue"
                value={formatRevenue(data.kpis.totalRevenue)}
                sub={data.kpis.collabsEstimatedRevenue ? `~${formatRevenue(data.kpis.collabsEstimatedRevenue)} est. from Collabs` : undefined}
              />
            </div>

            {/* ── Signups Over Time ────────────────────────────────────────── */}
            <div style={{ marginBottom: 36 }}>
              <SectionTitle>Signups Over Time</SectionTitle>
              {data.signupsByDay.length === 0 ? (
                <p style={{ fontSize: 13, opacity: 0.5 }}>No signup data for this period.</p>
              ) : (
                <>
                  <SignupBarChart days={data.signupsByDay} />
                  <p style={{ fontSize: 12, color: MAROON, opacity: 0.6, marginTop: 8 }}>
                    {data.signupsByDay.reduce((acc, d) => acc + d.count, 0).toLocaleString()} total signups in period
                  </p>
                </>
              )}
            </div>

            {/* ── Top Products grid ────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 36 }}>
              {/* By Clicks */}
              <div>
                <SectionTitle>Top Products by Clicks</SectionTitle>
                <ProductList
                  items={data.topProductsByClicks.map((p) => ({
                    productId: p.productId,
                    name: p.name,
                    store: p.store,
                    count: p.clicks ?? 0,
                    countLabel: "click",
                  }))}
                />
              </div>

              {/* By Views */}
              <div>
                <SectionTitle>Top Products by Views</SectionTitle>
                <ProductList
                  items={data.topProductsByViews.map((p) => ({
                    productId: p.productId,
                    name: p.name,
                    store: p.store,
                    count: p.views ?? 0,
                    countLabel: "view",
                  }))}
                />
              </div>
            </div>

            {/* ── Top Stores ───────────────────────────────────────────────── */}
            <div style={{ marginBottom: 36 }}>
              <SectionTitle>Top Stores</SectionTitle>
              <StoresTable stores={data.topStores} />
            </div>

            {/* ── Conversions ──────────────────────────────────────────────── */}
            <div style={{ marginBottom: 36 }}>
              <SectionTitle>Orders</SectionTitle>

              {/* Matched / unmatched split */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  { label: "Total Orders", value: data.kpis.totalConversions, sub: null },
                  { label: "Attributed to VYA Click", value: data.kpis.matchedConversions, sub: "matched" },
                  { label: "Unattributed", value: data.kpis.unmatchedConversions, sub: "unmatched" },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      flex: "1 1 140px",
                      background: s.sub === "matched" ? "#dcfce7" : s.sub === "unmatched" ? "#fef9c3" : CREAM,
                      borderRadius: 8,
                      padding: "14px 18px",
                    }}
                  >
                    <p style={{ fontSize: 24, fontWeight: 700, color: MAROON, margin: "0 0 4px", lineHeight: 1 }}>
                      {s.value}
                    </p>
                    <p style={{ fontSize: 11, color: MAROON, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Orders table */}
              <ConversionsTable rows={data.recentConversions} />
            </div>

            {/* ── Referral Leaderboard ─────────────────────────────────────── */}
            {data.referralLeaderboard.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <SectionTitle>Referral Leaderboard</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.referralLeaderboard.map((entry, i) => (
                    <div
                      key={entry.code}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        backgroundColor: i === 0 ? CREAM : "white",
                        border: `1px solid ${CREAM}`,
                        borderRadius: 6,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: MAROON, opacity: 0.4, width: 20, textAlign: "right" }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: MAROON, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.name}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: MAROON, opacity: 0.55 }}>
                          {entry.email}
                        </p>
                      </div>
                      <code style={{ fontSize: 11, backgroundColor: CREAM, padding: "2px 6px", borderRadius: 4, color: MAROON }}>
                        {entry.code}
                      </code>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "white",
                          backgroundColor: MAROON,
                          borderRadius: 999,
                          padding: "2px 9px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.referralCount} referral{entry.referralCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Recent Activity ──────────────────────────────────────────── */}
            <div style={{ marginBottom: 36 }}>
              <SectionTitle>Recent Activity</SectionTitle>
              {data.recentActivity.length === 0 ? (
                <p style={{ fontSize: 13, opacity: 0.5 }}>No recent activity.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.recentActivity.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "9px 14px",
                        border: `1px solid ${CREAM}`,
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          backgroundColor: CREAM,
                          color: MAROON,
                          padding: "2px 7px",
                          borderRadius: 4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.type}
                      </span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500, color: MAROON }}>
                        {item.productName ?? item.productId ?? "Unknown product"}
                      </span>
                      {item.store && (
                        <span style={{ fontSize: 11, color: MAROON, opacity: 0.55, whiteSpace: "nowrap" }}>
                          {item.store}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: MAROON, opacity: 0.4, whiteSpace: "nowrap" }}>
                        {relativeTime(item.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── CollabsTab ───────────────────────────────────────────────────────────────

function CollabsTab() {
  const [partnerships, setPartnerships] = React.useState<CollabsPartnership[]>([]);
  const [syncedAt, setSyncedAt] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreds, setShowCreds] = React.useState(false);
  const [cookie, setCookie] = React.useState("");
  const [csrfToken, setCsrfToken] = React.useState("");
  const [savingCreds, setSavingCreds] = React.useState(false);
  const [credsMsg, setCredsMsg] = React.useState<string | null>(null);

  const load = React.useCallback(async (forceSync = false) => {
    forceSync ? setSyncing(true) : setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sync-collabs" + (forceSync ? "?sync=1" : ""));
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`);
        return;
      }
      setPartnerships(json.partnerships ?? []);
      setSyncedAt(json.syncedAt ?? null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sync-collabs");
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? `Error ${res.status}`); return; }
      setPartnerships(json.partnerships ?? []);
      setSyncedAt(json.syncedAt ?? null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSyncing(false);
    }
  }

  async function handleSaveCreds() {
    if (!cookie.trim() || !csrfToken.trim()) return;
    setSavingCreds(true);
    setCredsMsg(null);
    try {
      const res = await fetch("/api/admin/sync-collabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie: cookie.trim(), csrfToken: csrfToken.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setCredsMsg("Credentials saved. Syncing now…");
        setCookie(""); setCsrfToken(""); setShowCreds(false);
        await handleSync();
      } else {
        setCredsMsg(json.error ?? "Failed to save credentials.");
      }
    } finally {
      setSavingCreds(false);
    }
  }

  const totalCommission = partnerships.reduce((sum, p) => {
    const val = parseFloat(p.totalCommissionEarned.replace(/[^0-9.]/g, "")) || 0;
    return sum + val;
  }, 0);
  const totalOrders = partnerships.reduce((sum, p) => sum + p.totalOrders, 0);
  const totalVisits = partnerships.reduce((sum, p) => sum + p.totalLinkVisits, 0);

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          {syncedAt && (
            <p style={{ fontSize: 12, color: MAROON, opacity: 0.45 }}>
              Last synced {relativeTime(syncedAt)}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowCreds((v) => !v)}
            style={{ padding: "7px 16px", fontSize: 12, border: `1px solid ${MAROON}`, background: "transparent", color: MAROON, cursor: "pointer", opacity: 0.7 }}
          >
            Update Credentials
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{ padding: "7px 16px", fontSize: 12, border: "none", background: MAROON, color: "#F7F3EA", cursor: syncing ? "not-allowed" : "pointer", opacity: syncing ? 0.6 : 1 }}
          >
            {syncing ? "Syncing…" : "Sync Now"}
          </button>
        </div>
      </div>

      {/* Credentials form */}
      {showCreds && (
        <div style={{ background: "#fff", border: `1px solid ${CREAM}`, borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: MAROON, marginBottom: 12 }}>Update Shopify Collabs Session</p>
          <p style={{ fontSize: 12, color: MAROON, opacity: 0.55, marginBottom: 16, lineHeight: 1.6 }}>
            Go to <strong>collabs.shopify.com</strong>, open DevTools → Network, click any request, and copy the <code style={{ background: CREAM, padding: "1px 4px" }}>cookie</code> and <code style={{ background: CREAM, padding: "1px 4px" }}>x-csrf-token</code> headers.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              placeholder="Cookie string (starts with _shopify_y=...)"
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              rows={3}
              style={{ width: "100%", border: `1px solid rgba(93,15,23,0.2)`, padding: "8px 12px", fontSize: 12, color: MAROON, fontFamily: "monospace", resize: "vertical" }}
            />
            <input
              placeholder="x-csrf-token"
              value={csrfToken}
              onChange={(e) => setCsrfToken(e.target.value)}
              style={{ border: `1px solid rgba(93,15,23,0.2)`, padding: "8px 12px", fontSize: 12, color: MAROON, fontFamily: "monospace" }}
            />
            <button
              onClick={handleSaveCreds}
              disabled={savingCreds || !cookie.trim() || !csrfToken.trim()}
              style={{ alignSelf: "flex-start", padding: "8px 20px", fontSize: 12, background: MAROON, color: "#F7F3EA", border: "none", cursor: "pointer", opacity: savingCreds ? 0.6 : 1 }}
            >
              {savingCreds ? "Saving…" : "Save & Sync"}
            </button>
            {credsMsg && <p style={{ fontSize: 12, color: MAROON, opacity: 0.7 }}>{credsMsg}</p>}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: 14, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#b91c1c", fontSize: 13, marginBottom: 20 }}>
          {error}
          {error.toLowerCase().includes("expired") || error.toLowerCase().includes("credential") ? (
            <button onClick={() => setShowCreds(true)} style={{ marginLeft: 12, fontSize: 12, color: "#b91c1c", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>
              Update credentials
            </button>
          ) : null}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4, fontSize: 14 }}>Loading…</div>
      ) : partnerships.length === 0 && !error ? (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4, fontSize: 14 }}>
          No partnerships found. Try syncing or updating your credentials.
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
            <StatCard label="Total Commission" value={`$${totalCommission.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <StatCard label="Total Orders" value={totalOrders.toLocaleString()} />
            <StatCard label="Total Link Visits" value={totalVisits.toLocaleString()} />
            <StatCard label="Active Partnerships" value={partnerships.length.toString()} />
          </div>

          {/* Partnerships table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Store", "Link Visits", "Orders", "Commission Earned"].map((h) => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 700, color: MAROON, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.07em", padding: "8px 12px", textAlign: h === "Store" ? "left" : "right", borderBottom: `2px solid ${CREAM}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partnerships
                  .slice()
                  .sort((a, b) => {
                    const av = parseFloat(a.totalCommissionEarned.replace(/[^0-9.]/g, "")) || 0;
                    const bv = parseFloat(b.totalCommissionEarned.replace(/[^0-9.]/g, "")) || 0;
                    return bv - av;
                  })
                  .map((p, i) => (
                  <tr key={p.id} style={{ backgroundColor: i % 2 === 0 ? "white" : "#fdfbf7", borderBottom: `1px solid ${CREAM}` }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: MAROON }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {p.logoUrl && (
                          <img src={p.logoUrl} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
                        )}
                        {p.name}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: MAROON, opacity: 0.7 }}>{p.totalLinkVisits.toLocaleString()}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: MAROON, opacity: 0.7 }}>{p.totalOrders.toLocaleString()}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: MAROON }}>{p.totalCommissionEarned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── InventoryTab ─────────────────────────────────────────────────────────────

function InventoryTab({ inv }: { inv: InventoryStats }) {
  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 36 }}>
        <StatCard label="Total Products" value={inv.productCount.toLocaleString()} />
        <StatCard label="Inventory Value" value={fmt(inv.inventoryValue)} />
        <StatCard label="Potential Commission" value={fmt(inv.potentialCommission)} />
      </div>

      {/* Commission tier breakdown */}
      <div style={{ marginBottom: 36 }}>
        <SectionTitle>Commission Tiers</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {[
            { label: "Under $1k · 7%", count: inv.tier1Count },
            { label: "$1k–$5k · 5%", count: inv.tier2Count },
            { label: "Over $5k · 3%", count: inv.tier3Count },
          ].map((tier) => (
            <div
              key={tier.label}
              style={{
                background: "#fff",
                border: `1px solid ${CREAM}`,
                borderRadius: 8,
                padding: "16px 24px",
                flex: "1 1 160px",
              }}
            >
              <p style={{ fontSize: 28, fontWeight: 700, color: MAROON, margin: "0 0 4px", lineHeight: 1 }}>
                {tier.count.toLocaleString()}
              </p>
              <p style={{ fontSize: 11, color: MAROON, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                {tier.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Per-store table */}
      <div style={{ marginBottom: 36 }}>
        <SectionTitle>Inventory by Store</SectionTitle>
        {inv.byStore.length === 0 ? (
          <p style={{ fontSize: 13, opacity: 0.5 }}>No inventory data.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Store", "Products", "Inventory Value", "Potential Commission"].map((h) => (
                    <th
                      key={h}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: MAROON,
                        opacity: 0.55,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        padding: "8px 12px",
                        textAlign: h === "Store" ? "left" : "right",
                        borderBottom: `2px solid ${CREAM}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inv.byStore.map((row, i) => (
                  <tr key={row.storeSlug} style={{ backgroundColor: i % 2 === 0 ? "white" : "#fdfbf7" }}>
                    <td style={{ fontSize: 13, color: MAROON, padding: "9px 12px", fontWeight: 600, borderBottom: `1px solid ${CREAM}` }}>
                      {row.storeSlug}
                    </td>
                    <td style={{ fontSize: 13, color: MAROON, padding: "9px 12px", textAlign: "right", borderBottom: `1px solid ${CREAM}` }}>
                      {row.productCount.toLocaleString()}
                    </td>
                    <td style={{ fontSize: 13, color: MAROON, padding: "9px 12px", textAlign: "right", borderBottom: `1px solid ${CREAM}` }}>
                      {fmt(row.inventoryValue)}
                    </td>
                    <td style={{ fontSize: 13, color: MAROON, padding: "9px 12px", textAlign: "right", borderBottom: `1px solid ${CREAM}` }}>
                      {fmt(row.potentialCommission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SignupBarChart ────────────────────────────────────────────────────────────

function SignupBarChart({ days }: { days: SignupDay[] }) {
  const max = Math.max(...days.map((d) => d.count), 1);
  // Show at most ~60 bars; if more, take last 60
  const visible = days.length > 60 ? days.slice(days.length - 60) : days;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120, minWidth: visible.length * 18 }}>
        {visible.map((d) => {
          const pct = (d.count / max) * 100;
          return (
            <div
              key={d.date}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto", width: 14 }}
              title={`${d.date}: ${d.count}`}
            >
              <div
                style={{
                  width: "100%",
                  height: `${pct}%`,
                  minHeight: d.count > 0 ? 3 : 0,
                  backgroundColor: MAROON,
                  borderRadius: "2px 2px 0 0",
                  transition: "height 0.2s",
                }}
              />
            </div>
          );
        })}
      </div>
      {/* Date labels — show every ~7th */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 3, minWidth: visible.length * 18, marginTop: 4 }}>
        {visible.map((d, i) => (
          <div key={d.date} style={{ flex: "0 0 auto", width: 14, overflow: "hidden" }}>
            {i % 7 === 0 && (
              <span
                style={{
                  fontSize: 9,
                  color: MAROON,
                  opacity: 0.5,
                  whiteSpace: "nowrap",
                  display: "block",
                  transform: "rotate(-45deg)",
                  transformOrigin: "top left",
                  marginTop: 2,
                }}
              >
                {dayLabel(d.date)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ProductList ───────────────────────────────────────────────────────────────

type ProductListItem = {
  productId: string;
  name: string | null;
  store: string | null;
  count: number;
  countLabel: string;
};

function ProductList({ items }: { items: ProductListItem[] }) {
  if (items.length === 0) {
    return <p style={{ fontSize: 13, opacity: 0.5 }}>No data for this period.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => {
        const displayName = item.name ?? item.productId ?? "Unknown";
        // Link to /products/[id] if productId looks like store-slug-number
        const linkHref = item.productId ? `/products/${item.productId}` : undefined;

        return (
          <div
            key={`${item.productId ?? "unknown"}-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              backgroundColor: i === 0 ? CREAM : "white",
              border: `1px solid ${CREAM}`,
              borderRadius: 6,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: MAROON, opacity: 0.35, width: 18, textAlign: "right", flexShrink: 0 }}>
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {linkHref ? (
                <Link
                  href={linkHref}
                  style={{
                    fontSize: 13,
                    color: MAROON,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "block",
                    textDecoration: "none",
                  }}
                  title={displayName}
                >
                  {displayName}
                </Link>
              ) : (
                <span
                  style={{
                    fontSize: 13,
                    color: MAROON,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "block",
                  }}
                  title={displayName}
                >
                  {displayName}
                </span>
              )}
              {item.store && (
                <span style={{ fontSize: 11, color: MAROON, opacity: 0.5 }}>{item.store}</span>
              )}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: MAROON,
                backgroundColor: CREAM,
                borderRadius: 999,
                padding: "2px 9px",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {item.count.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── ConversionsTable ──────────────────────────────────────────────────────────

function ConversionsTable({ rows }: { rows: ConversionRow[] }) {
  if (rows.length === 0) {
    return <p style={{ fontSize: 13, opacity: 0.5 }}>No orders in this period.</p>;
  }

  const hStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: MAROON, opacity: 0.55,
    textTransform: "uppercase", letterSpacing: "0.07em",
    padding: "8px 12px", textAlign: "left", borderBottom: `2px solid ${CREAM}`,
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={hStyle}>Time</th>
            <th style={hStyle}>Store</th>
            <th style={{ ...hStyle, textAlign: "right" }}>Order Total</th>
            <th style={hStyle}>Buyer</th>
            <th style={hStyle}>Attribution</th>
            <th style={hStyle}>Clicked Product</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.conversionId} style={{ backgroundColor: i % 2 === 0 ? "white" : "#fdfbf7", borderBottom: `1px solid ${CREAM}` }}>
              <td style={{ padding: "9px 12px", color: MAROON, opacity: 0.6, whiteSpace: "nowrap" }}>
                {relativeTime(r.timestamp)}
              </td>
              <td style={{ padding: "9px 12px", fontWeight: 600, color: MAROON }}>
                {r.storeName}
              </td>
              <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: MAROON }}>
                {formatRevenue(r.orderTotal)}
              </td>
              <td style={{ padding: "9px 12px", color: MAROON, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.buyerEmail ? (
                  <span title={r.buyerEmail} style={{ fontSize: 12 }}>
                    {r.buyerName || r.buyerEmail}
                    {r.buyerName && <span style={{ display: "block", fontSize: 10, opacity: 0.5 }}>{r.buyerEmail}</span>}
                  </span>
                ) : (
                  <span style={{ opacity: 0.35, fontSize: 11 }}>—</span>
                )}
              </td>
              <td style={{ padding: "9px 12px" }}>
                <span style={{
                  display: "inline-block",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: r.matched ? "#dcfce7" : "#fef9c3",
                  color: r.matched ? "#166534" : "#854d0e",
                }}>
                  {r.matched ? "Matched" : "Unmatched"}
                </span>
              </td>
              <td style={{ padding: "9px 12px", color: MAROON, opacity: 0.7, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.clickedProduct ?? (r.matched ? "—" : <span style={{ opacity: 0.4 }}>no click recorded</span>)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── StoresTable ───────────────────────────────────────────────────────────────

function StoresTable({ stores }: { stores: TopStore[] }) {
  if (stores.length === 0) {
    return <p style={{ fontSize: 13, opacity: 0.5 }}>No store data for this period.</p>;
  }

  const headerStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: MAROON,
    opacity: 0.55,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    padding: "8px 12px",
    textAlign: "left",
    borderBottom: `2px solid ${CREAM}`,
  };

  const cellStyle: React.CSSProperties = {
    fontSize: 13,
    color: MAROON,
    padding: "9px 12px",
    borderBottom: `1px solid ${CREAM}`,
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={headerStyle}>Store</th>
            <th style={{ ...headerStyle, textAlign: "right" }}>Clicks</th>
            <th style={{ ...headerStyle, textAlign: "right" }}>Conversions</th>
            <th style={{ ...headerStyle, textAlign: "right" }}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((s, i) => (
            <tr key={s.store ?? i} style={{ backgroundColor: i % 2 === 0 ? "white" : "#fdfbf7" }}>
              <td style={{ ...cellStyle, fontWeight: 600 }}>{s.store ?? "—"}</td>
              <td style={{ ...cellStyle, textAlign: "right" }}>{s.clicks.toLocaleString()}</td>
              <td style={{ ...cellStyle, textAlign: "right" }}>{s.conversions.toLocaleString()}</td>
              <td style={{ ...cellStyle, textAlign: "right" }}>{formatRevenueShort(s.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
