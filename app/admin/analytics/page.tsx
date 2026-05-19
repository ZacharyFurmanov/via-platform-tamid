"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";

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
  collabsTotalCommission?: number;
  totalCommission?: number;
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
  returned: boolean;
  returnedAt: string | null;
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

type SearchEntry = {
  query: string;
  count: number;
};

type TrafficSource = {
  source: string;
  medium: string | null;
  campaign: string | null;
  visits: number;
  knownUsers: number;
};

type ClicksBySource = {
  source: string;
  clicks: number;
};

type ConversionsBySource = {
  source: string;
  conversions: number;
  revenue: number;
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
  topSearches: SearchEntry[];
  trafficSources: TrafficSource[];
  clicksBySource: ClicksBySource[];
  conversionsBySource: ConversionsBySource[];
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

const DARK = "#09090b";
const GRAY = "#71717a";
const MUTED = "#a1a1aa";
const BORDER = "#e4e4e7";
const BG_PAGE = "#f8f9fa";
const BG_CARD = "#ffffff";
const BG_HOVER = "#fafafa";
const PRIMARY = "#18181b";

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, href }: { label: string; value: string | number; sub?: string; href?: string }) {
  const inner = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px", fontWeight: 500 }}>
          {label}
        </p>
        {href && <span style={{ fontSize: 11, color: MUTED }}>→</span>}
      </div>
      <p style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 10, color: MUTED, margin: "4px 0 0" }}>{sub}</p>
      )}
    </>
  );
  if (href) {
    return (
      <Link href={href} style={{ backgroundColor: BG_HOVER, borderRadius: 8, padding: "16px 20px", minWidth: 120, flex: "1 1 140px", textDecoration: "none", display: "block", transition: "opacity 0.15s", border: `1px solid ${BORDER}` }} onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
        {inner}
      </Link>
    );
  }
  return (
    <div style={{ backgroundColor: BG_HOVER, borderRadius: 8, padding: "16px 20px", minWidth: 120, flex: "1 1 140px", border: `1px solid ${BORDER}` }}>
      {inner}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 11, fontWeight: 500, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 14px" }}>
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
        fontWeight: 500,
        borderRadius: 6,
        border: `1px solid ${BORDER}`,
        backgroundColor: active ? PRIMARY : BG_CARD,
        color: active ? "#fff" : DARK,
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

  // Re-fetch silently when the tab becomes visible again (e.g. after matching in Conversions)
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") fetchData(range, true);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [range, fetchData]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", backgroundColor: BG_PAGE, color: DARK, fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Page title + tabs + range picker */}
      <div style={{ background: BG_CARD, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: DARK }}>Analytics</h1>
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
                fontWeight: 500,
                border: "none",
                borderBottom: tab === t ? `2px solid ${DARK}` : "2px solid transparent",
                background: "transparent",
                color: tab === t ? DARK : GRAY,
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
            <p style={{ fontSize: 11, fontWeight: 500, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Signups</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
              <StatCard label="Registered Accounts" value={data.kpis.totalCustomers.toLocaleString()} href="/admin/customers" />
<StatCard label="Pilot Users" value={data.kpis.pilotTotal.toLocaleString()} href="/admin/customers" />
              <StatCard label="Approved" value={data.kpis.approvedCustomers.toLocaleString()} href="/admin/customers" />
              <StatCard label="Waitlist Only" value={data.kpis.waitlistOnly.toLocaleString()} href="/admin/customers" />
              <StatCard
                label={range === "7d" ? "New This Week" : range === "30d" ? "New This Month" : "New (All Time)"}
                value={data.kpis.newSignupsThisWeek.toLocaleString()}
                href="/admin/customers"
              />
            </div>
            {/* Activity group */}
            <p style={{ fontSize: 11, fontWeight: 500, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Activity</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 36 }}>
              <StatCard label="Store Click-throughs" value={data.kpis.totalClicks.toLocaleString()} sub="clicks out to store pages" />
              <StatCard label="Product Views" value={data.kpis.totalViews.toLocaleString()} />
              <StatCard
                label="Orders"
                value={data.kpis.totalConversions.toLocaleString()}
                sub={data.kpis.collabsTotalOrders ? `${data.kpis.collabsTotalOrders} via Shopify Collabs` : undefined}
                href="/admin/conversions"
              />
              <StatCard
                label="Revenue"
                value={formatRevenue(data.kpis.totalRevenue)}
                sub={data.kpis.collabsEstimatedRevenue ? `~${formatRevenue(data.kpis.collabsEstimatedRevenue)} est. from Collabs` : "All time"}
                href="/admin/key-metrics"
              />
              <StatCard
                label="Total Commission"
                value={data.kpis.totalCommission ? formatRevenue(data.kpis.totalCommission) : "—"}
                sub="All time · 7/5/3% tiers"
                href="/admin/conversions"
              />
            </div>


            {/* ── Source Attribution Funnel ─────────────────────────────── */}
            {data.trafficSources && data.trafficSources.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <SectionTitle>Source Attribution</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {/* Header */}
                  <div style={{ display: "grid", gridTemplateColumns: "140px 80px 80px 80px 80px 90px 90px", gap: 12, padding: "0 12px 8px", borderBottom: `1px solid ${BORDER}` }}>
                    {[
                      { label: "Source", align: "left" },
                      { label: "Visits", align: "right" },
                      { label: "Clicks", align: "right" },
                      { label: "Clicks/Visit", align: "right" },
                      { label: "Orders", align: "right" },
                      { label: "Revenue", align: "right" },
                      { label: "Conv %", align: "right" },
                    ].map((h) => (
                      <span key={h.label} style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, textAlign: h.align as "left" | "right" }}>{h.label}</span>
                    ))}
                  </div>
                  {/* Rows — built from trafficSources (visits) joined with clicks + conversions */}
                  {(() => {
                    // Collect all sources that appear in any dataset
                    const allSources = Array.from(new Set([
                      ...data.trafficSources.map((r) => r.source),
                      ...(data.clicksBySource ?? []).map((r) => r.source),
                      ...(data.conversionsBySource ?? []).map((r) => r.source),
                    ]));

                    const rows = allSources.map((source) => {
                      const visitRow = data.trafficSources.find((r) => r.source === source);
                      const clickRow = data.clicksBySource?.find((r) => r.source === source);
                      const convRow = data.conversionsBySource?.find((r) => r.source === source);
                      return {
                        source,
                        visits: visitRow?.visits ?? 0,
                        clicks: clickRow?.clicks ?? 0,
                        orders: convRow?.conversions ?? 0,
                        revenue: convRow?.revenue ?? 0,
                      };
                    }).sort((a, b) => b.visits - a.visits);

                    const maxVisits = rows[0]?.visits ?? 1;

                    return rows.map((row, i) => {
                      const clickRate = row.visits > 0 ? (row.clicks / row.visits) * 100 : 0;
                      const convRate = row.clicks > 0 ? (row.orders / row.clicks) * 100 : 0;
                      return (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 80px 80px 80px 80px 90px 90px", gap: 12, padding: "10px 12px", backgroundColor: i % 2 === 0 ? BG_HOVER : "transparent", borderRadius: 6, alignItems: "center" }}>
                          {/* Source + bar */}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: DARK, textTransform: "capitalize", marginBottom: 3 }}>{row.source}</div>
                            <div style={{ height: 3, backgroundColor: BORDER, borderRadius: 2 }}>
                              <div style={{ height: "100%", backgroundColor: "#5D0F17", borderRadius: 2, width: `${(row.visits / maxVisits) * 100}%`, opacity: 0.6 }} />
                            </div>
                          </div>
                          {/* Visits */}
                          <span style={{ fontSize: 13, fontWeight: 600, color: DARK, textAlign: "right" }}>{row.visits.toLocaleString()}</span>
                          {/* Clicks */}
                          <span style={{ fontSize: 13, fontWeight: 600, color: row.clicks > 0 ? DARK : MUTED, textAlign: "right" }}>{row.clicks > 0 ? row.clicks.toLocaleString() : "—"}</span>
                          {/* Click rate */}
                          <span style={{ fontSize: 12, color: clickRate >= 10 ? "#15803d" : clickRate > 0 ? GRAY : MUTED, textAlign: "right" }}>{clickRate > 0 ? `${clickRate.toFixed(1)}%` : "—"}</span>
                          {/* Orders */}
                          <span style={{ fontSize: 13, fontWeight: 600, color: row.orders > 0 ? "#15803d" : MUTED, textAlign: "right" }}>{row.orders > 0 ? row.orders.toLocaleString() : "—"}</span>
                          {/* Revenue */}
                          <span style={{ fontSize: 13, fontWeight: 700, color: row.revenue > 0 ? "#15803d" : MUTED, textAlign: "right" }}>{row.revenue > 0 ? `$${row.revenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—"}</span>
                          {/* Conv rate */}
                          <span style={{ fontSize: 12, color: convRate >= 5 ? "#15803d" : convRate > 0 ? GRAY : MUTED, textAlign: "right" }}>{convRate > 0 ? `${convRate.toFixed(1)}%` : "—"}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

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

            {/* ── Top Searches ─────────────────────────────────────────────── */}
            <div style={{ marginBottom: 36 }}>
              <SectionTitle>Top Searches</SectionTitle>
              {data.topSearches.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED }}>No searches recorded yet.</p>
              ) : (
                <>
                  {/* #1 highlight */}
                  <div style={{ backgroundColor: BG_HOVER, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED }}>#1</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: DARK }}>{data.topSearches[0].query}</span>
                    <span style={{ fontSize: 12, color: MUTED, marginLeft: "auto" }}>{data.topSearches[0].count} searches</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {data.topSearches.slice(1).map((s, i) => (
                      <div key={s.query} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, color: MUTED, width: 20, textAlign: "right", flexShrink: 0 }}>{i + 2}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: "0 0 3px", fontSize: 13, color: DARK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.query}</p>
                          <div style={{ height: 4, backgroundColor: BORDER, borderRadius: 2 }}>
                            <div style={{ height: "100%", backgroundColor: DARK, borderRadius: 2, width: `${(s.count / data.topSearches[0].count) * 100}%`, opacity: 0.4 }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
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
                  { label: "Total Orders", value: data.kpis.totalConversions, sub: null, href: "/admin/conversions?filter=all" },
                  { label: "Attributed to VYA Click", value: data.kpis.matchedConversions, sub: "matched", href: "/admin/conversions?filter=all" },
                  { label: "Unattributed", value: data.kpis.unmatchedConversions, sub: "unmatched", href: "/admin/conversions?filter=unmatched" },
                ].map((s) => (
                  <Link
                    key={s.label}
                    href={s.href}
                    style={{
                      flex: "1 1 140px",
                      background: s.sub === "matched" ? "#dcfce7" : s.sub === "unmatched" ? "#fef9c3" : BG_HOVER,
                      borderRadius: 8,
                      padding: "14px 18px",
                      textDecoration: "none",
                      display: "block",
                      transition: "opacity 0.15s",
                      border: `1px solid ${BORDER}`,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <p style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: "0 0 4px", lineHeight: 1 }}>
                        {s.value}
                      </p>
                      <span style={{ fontSize: 11, color: MUTED }}>→</span>
                    </div>
                    <p style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0, fontWeight: 500 }}>
                      {s.label}
                    </p>
                  </Link>
                ))}
              </div>

              {/* Orders table */}
              <ConversionsTable rows={data.recentConversions} onRefresh={() => fetchData(range, true)} />
            </div>


            {/* ── Recent Activity ──────────────────────────────────────────── */}
            <div style={{ marginBottom: 36 }}>
              <SectionTitle>Recent Activity</SectionTitle>
              {data.recentActivity.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED }}>No recent activity.</p>
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
                        border: `1px solid ${BORDER}`,
                        borderRadius: 6,
                        fontSize: 13,
                        background: BG_CARD,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          backgroundColor: "#f4f4f5",
                          color: DARK,
                          padding: "2px 7px",
                          borderRadius: 4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        VIEW
                      </span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500, color: DARK }}>
                        {item.productName ?? item.productId ?? "Unknown product"}
                      </span>
                      {item.store && (
                        <span style={{ fontSize: 11, color: GRAY, whiteSpace: "nowrap" }}>
                          {item.store}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: MUTED, whiteSpace: "nowrap" }}>
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
            <p style={{ fontSize: 12, color: MUTED }}>
              Last synced {relativeTime(syncedAt)}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowCreds((v) => !v)}
            style={{ padding: "7px 16px", fontSize: 12, fontWeight: 500, border: `1px solid ${BORDER}`, background: "#fff", color: DARK, cursor: "pointer", borderRadius: 6 }}
          >
            Update Credentials
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{ padding: "7px 16px", fontSize: 12, fontWeight: 500, border: "none", background: PRIMARY, color: "#fff", cursor: syncing ? "not-allowed" : "pointer", opacity: syncing ? 0.6 : 1, borderRadius: 6 }}
          >
            {syncing ? "Syncing…" : "Sync Now"}
          </button>
        </div>
      </div>

      {/* Credentials form */}
      {showCreds && (
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 12 }}>Update Shopify Collabs Session</p>
          <p style={{ fontSize: 12, color: GRAY, marginBottom: 16, lineHeight: 1.6 }}>
            Go to <strong>collabs.shopify.com</strong>, open DevTools → Network, click any request, and copy the <code style={{ background: "#f4f4f5", color: DARK, padding: "1px 4px", borderRadius: 4 }}>cookie</code> and <code style={{ background: "#f4f4f5", color: DARK, padding: "1px 4px", borderRadius: 4 }}>x-csrf-token</code> headers.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              placeholder="Cookie string (starts with _shopify_y=...)"
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              rows={3}
              style={{ width: "100%", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px 12px", fontSize: 12, color: DARK, fontFamily: "monospace", resize: "vertical" }}
            />
            <input
              placeholder="x-csrf-token"
              value={csrfToken}
              onChange={(e) => setCsrfToken(e.target.value)}
              style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px 12px", fontSize: 12, color: DARK, fontFamily: "monospace" }}
            />
            <button
              onClick={handleSaveCreds}
              disabled={savingCreds || !cookie.trim() || !csrfToken.trim()}
              style={{ alignSelf: "flex-start", padding: "8px 20px", fontSize: 12, fontWeight: 500, background: PRIMARY, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", opacity: savingCreds ? 0.6 : 1 }}
            >
              {savingCreds ? "Saving…" : "Save & Sync"}
            </button>
            {credsMsg && <p style={{ fontSize: 12, color: GRAY }}>{credsMsg}</p>}
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
        <div style={{ textAlign: "center", padding: "60px 0", color: MUTED, fontSize: 14 }}>Loading…</div>
      ) : partnerships.length === 0 && !error ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: MUTED, fontSize: 14 }}>
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
          <div style={{ overflowX: "auto", border: `1px solid ${BORDER}`, borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: BG_HOVER }}>
                  {["Store", "Link Visits", "Orders", "Commission Earned"].map((h) => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 500, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em", padding: "8px 12px", textAlign: h === "Store" ? "left" : "right", borderBottom: `1px solid ${BORDER}` }}>
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
                  <tr key={p.id} style={{ backgroundColor: i % 2 === 0 ? BG_CARD : BG_HOVER, borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: DARK }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {p.logoUrl && (
                          <img src={p.logoUrl} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
                        )}
                        {p.name}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: GRAY }}>{p.totalLinkVisits.toLocaleString()}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: GRAY }}>{p.totalOrders.toLocaleString()}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: DARK }}>{p.totalCommissionEarned}</td>
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
                background: BG_CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: "16px 24px",
                flex: "1 1 160px",
              }}
            >
              <p style={{ fontSize: 28, fontWeight: 700, color: DARK, margin: "0 0 4px", lineHeight: 1 }}>
                {tier.count.toLocaleString()}
              </p>
              <p style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0, fontWeight: 500 }}>
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
          <p style={{ fontSize: 13, color: MUTED }}>No inventory data.</p>
        ) : (
          <div style={{ overflowX: "auto", border: `1px solid ${BORDER}`, borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: BG_HOVER }}>
                  {["Store", "Products", "Inventory Value", "Potential Commission"].map((h) => (
                    <th
                      key={h}
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: MUTED,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        padding: "8px 12px",
                        textAlign: h === "Store" ? "left" : "right",
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inv.byStore.map((row, i) => (
                  <tr key={row.storeSlug} style={{ backgroundColor: i % 2 === 0 ? BG_CARD : BG_HOVER }}>
                    <td style={{ fontSize: 13, color: DARK, padding: "9px 12px", fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>
                      {row.storeSlug}
                    </td>
                    <td style={{ fontSize: 13, color: DARK, padding: "9px 12px", textAlign: "right", borderBottom: `1px solid ${BORDER}` }}>
                      {row.productCount.toLocaleString()}
                    </td>
                    <td style={{ fontSize: 13, color: DARK, padding: "9px 12px", textAlign: "right", borderBottom: `1px solid ${BORDER}` }}>
                      {fmt(row.inventoryValue)}
                    </td>
                    <td style={{ fontSize: 13, color: DARK, padding: "9px 12px", textAlign: "right", borderBottom: `1px solid ${BORDER}` }}>
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
  // Aggregate into weeks when there are more than 21 data points
  type Bar = { label: string; count: number };
  let bars: Bar[];

  if (days.length > 21) {
    // Group by week (chunks of 7 days)
    const weeks: Bar[] = [];
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7);
      const total = chunk.reduce((s, d) => s + d.count, 0);
      weeks.push({ label: dayLabel(chunk[0].date), count: total });
    }
    bars = weeks;
  } else {
    bars = days.map((d) => ({ label: dayLabel(d.date), count: d.count }));
  }

  const max = Math.max(...bars.map((b) => b.count), 1);
  const CHART_HEIGHT = 160;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: CHART_HEIGHT, minWidth: bars.length * 28 }}>
        {bars.map((b, i) => {
          const pct = (b.count / max) * 100;
          const barH = Math.max(pct / 100 * CHART_HEIGHT, b.count > 0 ? 6 : 0);
          return (
            <div
              key={i}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", flex: "0 0 auto", width: 22, height: "100%" }}
              title={`${b.label}: ${b.count} signup${b.count === 1 ? "" : "s"}`}
            >
              {b.count > 0 && barH > 20 && (
                <span style={{ fontSize: 9, color: MUTED, marginBottom: 2 }}>{b.count}</span>
              )}
              <div
                style={{
                  width: "100%",
                  height: barH,
                  backgroundColor: DARK,
                  borderRadius: "2px 2px 0 0",
                  opacity: 0.75,
                }}
              />
            </div>
          );
        })}
      </div>
      {/* Labels */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 4, minWidth: bars.length * 28, marginTop: 4, borderTop: `1px solid ${BORDER}`, paddingTop: 6 }}>
        {bars.map((b, i) => (
          <div key={i} style={{ flex: "0 0 auto", width: 22, overflow: "visible" }}>
            <span
              style={{
                fontSize: 9,
                color: MUTED,
                whiteSpace: "nowrap",
                display: "block",
                transform: "rotate(-40deg)",
                transformOrigin: "top left",
              }}
            >
              {b.label}
            </span>
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
    return <p style={{ fontSize: 13, color: MUTED }}>No data for this period.</p>;
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
              backgroundColor: i === 0 ? BG_HOVER : BG_CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 500, color: MUTED, width: 18, textAlign: "right", flexShrink: 0 }}>
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {linkHref ? (
                <Link
                  href={linkHref}
                  style={{
                    fontSize: 13,
                    color: DARK,
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
                    color: DARK,
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
                <span style={{ fontSize: 11, color: MUTED }}>{item.store}</span>
              )}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: DARK,
                backgroundColor: "#f4f4f5",
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

type CandidateClick = { clickId: string; timestamp: string; productName: string; storeSlug: string; userId: string | null; userEmail: string | null; userName: string | null };

function ConversionsTable({ rows, onRefresh }: { rows: ConversionRow[]; onRefresh: () => void }) {
  const [selected, setSelected] = React.useState<ConversionRow | null>(null);
  const [candidates, setCandidates] = React.useState<CandidateClick[]>([]);
  const [candidatesLoading, setCandidatesLoading] = React.useState(false);
  const [userInput, setUserInput] = React.useState("");
  const [matching, setMatching] = React.useState<string | null>(null);
  const [addingOrder, setAddingOrder] = React.useState(false);
  const [newOrder, setNewOrder] = React.useState({ storeSlug: "", storeName: "", orderId: "", orderTotal: "", currency: "USD", userEmail: "", timestamp: "" });
  const [savingOrder, setSavingOrder] = React.useState(false);
  const [saveOrderError, setSaveOrderError] = React.useState<string | null>(null);

  function openMatch(r: ConversionRow) {
    setSelected(r);
    setUserInput(r.buyerEmail ?? "");
    setCandidates([]);
    setCandidatesLoading(true);
    fetch(`/api/admin/conversions/${r.conversionId}`)
      .then((res) => res.json())
      .then((d) => { setCandidates(d.clicks ?? []); setCandidatesLoading(false); })
      .catch(() => setCandidatesLoading(false));
  }

  async function matchToClick(clickId: string) {
    if (!selected) return;
    setMatching(clickId);
    await fetch(`/api/admin/conversions/${selected.conversionId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clickId }),
    });
    setMatching(null);
    setSelected(null);
    onRefresh();
  }

  async function matchToUser() {
    if (!selected || !userInput.trim()) return;
    setMatching("user");
    const input = userInput.trim();
    const body = input.includes("@") ? { userEmail: input } : { userId: input };
    const res = await fetch(`/api/admin/conversions/${selected.conversionId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const d = await res.json(); alert(d.error ?? "Not found"); }
    setMatching(null);
    setSelected(null);
    onRefresh();
  }

  async function markReturned(conversionId: string, currentlyReturned: boolean) {
    const action = currentlyReturned ? "unreturn" : "return";
    if (!currentlyReturned && !confirm("Mark this order as returned? It will be excluded from GMV.")) return;
    await fetch(`/api/admin/conversions/${conversionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    onRefresh();
  }

  async function deleteConversion(conversionId: string) {
    if (!confirm("Permanently delete this order record? This cannot be undone.")) return;
    await fetch(`/api/admin/conversions/${conversionId}`, { method: "DELETE" });
    onRefresh();
  }

  async function editAmount(conversionId: string, currentTotal: number) {
    const input = prompt("Enter corrected order total:", String(currentTotal));
    if (!input || isNaN(Number(input))) return;
    await fetch(`/api/admin/conversions/${conversionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderTotal: Number(input) }),
    });
    onRefresh();
  }

  async function saveManualOrder() {
    if (!newOrder.storeSlug || !newOrder.orderId || !newOrder.orderTotal) return;
    setSavingOrder(true);
    setSaveOrderError(null);
    const res = await fetch("/api/admin/conversions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOrder),
    });
    const d = await res.json();
    if (!res.ok) { setSaveOrderError(d.error ?? "Failed"); setSavingOrder(false); return; }
    setSavingOrder(false);
    setAddingOrder(false);
    setNewOrder({ storeSlug: "", storeName: "", orderId: "", orderTotal: "", currency: "USD", userEmail: "", timestamp: "" });
    onRefresh();
  }

  const hStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, color: MUTED,
    textTransform: "uppercase", letterSpacing: "0.07em",
    padding: "8px 12px", textAlign: "left", borderBottom: `1px solid ${BORDER}`,
    background: BG_HOVER,
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button
          onClick={() => setAddingOrder(true)}
          style={{ fontSize: 11, padding: "5px 14px", background: PRIMARY, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
          + Record Order
        </button>
      </div>

      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: MUTED }}>No orders in this period.</p>
      ) : (
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 600, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr>
                <th style={hStyle}>Time</th>
                <th style={hStyle}>Store</th>
                <th style={{ ...hStyle, textAlign: "right" }}>Order Total</th>
                <th style={hStyle}>Buyer</th>
                <th style={hStyle}>Attribution</th>
                <th style={hStyle}>Clicked Product</th>
                <th style={hStyle}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.conversionId} style={{ backgroundColor: i % 2 === 0 ? BG_CARD : BG_HOVER, borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "9px 12px", color: GRAY, whiteSpace: "nowrap" }}>{relativeTime(r.timestamp)}</td>
                  <td style={{ padding: "9px 12px", fontWeight: 600, color: DARK }}>{r.storeName}</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: DARK }}>
                    <span style={{ textDecoration: r.returned ? "line-through" : "none", opacity: r.returned ? 0.4 : 1 }}>{formatRevenue(r.orderTotal)}</span>
                    {r.returned && <span style={{ display: "block", fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#dc2626", letterSpacing: "0.08em" }}>Returned</span>}
                  </td>
                  <td style={{ padding: "9px 12px", color: DARK, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.buyerEmail ? (
                      <span title={r.buyerEmail} style={{ fontSize: 12 }}>
                        {r.buyerName || r.buyerEmail}
                        {r.buyerName && <span style={{ display: "block", fontSize: 10, color: MUTED }}>{r.buyerEmail}</span>}
                      </span>
                    ) : <span style={{ color: MUTED, fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ display: "inline-block", fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 99, background: r.matched ? "#dcfce7" : "#fef9c3", color: r.matched ? "#15803d" : "#854d0e" }}>
                      {r.matched ? "Matched" : "Unmatched"}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px", color: GRAY, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.clickedProduct ?? (r.matched ? "—" : <span style={{ color: MUTED }}>no click recorded</span>)}
                  </td>
                  <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => openMatch(r)}
                      style={{ fontSize: 11, padding: "3px 10px", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 4, color: DARK, cursor: "pointer", fontWeight: 500, marginRight: 6 }}
                    >
                      {r.matched ? "Re-match" : "Match"}
                    </button>
                    <button
                      onClick={() => editAmount(r.conversionId, r.orderTotal)}
                      style={{ fontSize: 11, padding: "3px 10px", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 4, color: GRAY, cursor: "pointer", marginRight: 6 }}
                    >
                      Edit $
                    </button>
                    <button
                      onClick={() => markReturned(r.conversionId, r.returned)}
                      style={{ fontSize: 11, padding: "3px 10px", background: "#fff", border: `1px solid ${r.returned ? BORDER : "#fca5a5"}`, borderRadius: 4, color: r.returned ? GRAY : "#dc2626", cursor: "pointer", marginRight: 6 }}
                    >
                      {r.returned ? "Undo Return" : "Return"}
                    </button>
                    <button
                      onClick={() => deleteConversion(r.conversionId)}
                      style={{ fontSize: 11, padding: "3px 10px", background: "#fff", border: "1px solid #fca5a5", borderRadius: 4, color: "#dc2626", cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Match panel */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100 }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 500, background: "#fff", zIndex: 101, overflowY: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)", fontFamily: "system-ui, sans-serif" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: DARK, margin: 0 }}>Match Order</p>
                <p style={{ fontSize: 12, color: MUTED, margin: "3px 0 0" }}>{selected.storeName} · {formatRevenue(selected.orderTotal)} · {relativeTime(selected.timestamp)}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: MUTED }}>×</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED, fontWeight: 500, margin: "0 0 8px" }}>Match to Customer</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Email address"
                  style={{ flex: 1, padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, color: DARK }}
                />
                <button
                  onClick={matchToUser}
                  disabled={!userInput.trim() || matching === "user"}
                  style={{ padding: "7px 14px", background: PRIMARY, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: !userInput.trim() ? 0.4 : 1 }}
                >
                  {matching === "user" ? "Saving…" : "Set"}
                </button>
              </div>
              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED, fontWeight: 500, margin: "0 0 8px" }}>Candidate Clicks (same store, ±48h)</p>
              {candidatesLoading ? (
                <p style={{ fontSize: 13, color: MUTED }}>Loading…</p>
              ) : candidates.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED }}>No clicks found in this window.</p>
              ) : candidates.map((click) => (
                <div key={click.clickId} style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: "10px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: DARK, margin: 0 }}>{click.productName || "—"}</p>
                    <p style={{ fontSize: 11, color: MUTED, margin: "2px 0 0" }}>
                      {new Date(click.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {click.userEmail && ` · ${click.userName || click.userEmail}`}
                    </p>
                  </div>
                  <button
                    onClick={() => matchToClick(click.clickId)}
                    disabled={matching === click.clickId}
                    style={{ padding: "5px 12px", background: PRIMARY, color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    {matching === click.clickId ? "Saving…" : "Use this"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Record Order modal */}
      {addingOrder && (
        <>
          <div onClick={() => setAddingOrder(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 460, background: "#fff", zIndex: 201, borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", padding: "24px 28px", fontFamily: "system-ui, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: DARK, margin: 0 }}>Record Order Manually</p>
              <button onClick={() => setAddingOrder(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: MUTED }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 11, color: GRAY, display: "block", marginBottom: 3 }}>Store Slug *</label><input value={newOrder.storeSlug} onChange={(e) => setNewOrder({ ...newOrder, storeSlug: e.target.value })} placeholder="porters-preloved" style={{ width: "100%", padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, color: DARK, boxSizing: "border-box" }} /></div>
                <div><label style={{ fontSize: 11, color: GRAY, display: "block", marginBottom: 3 }}>Store Name</label><input value={newOrder.storeName} onChange={(e) => setNewOrder({ ...newOrder, storeName: e.target.value })} placeholder="Porter's Preloved" style={{ width: "100%", padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, color: DARK, boxSizing: "border-box" }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 11, color: GRAY, display: "block", marginBottom: 3 }}>Order ID *</label><input value={newOrder.orderId} onChange={(e) => setNewOrder({ ...newOrder, orderId: e.target.value })} style={{ width: "100%", padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, color: DARK, boxSizing: "border-box" }} /></div>
                <div><label style={{ fontSize: 11, color: GRAY, display: "block", marginBottom: 3 }}>Amount *</label><input type="number" value={newOrder.orderTotal} onChange={(e) => setNewOrder({ ...newOrder, orderTotal: e.target.value })} placeholder="0.00" style={{ width: "100%", padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, color: DARK, boxSizing: "border-box" }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 11, color: GRAY, display: "block", marginBottom: 3 }}>Currency</label><input value={newOrder.currency} onChange={(e) => setNewOrder({ ...newOrder, currency: e.target.value })} placeholder="USD" style={{ width: "100%", padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, color: DARK, boxSizing: "border-box" }} /></div>
                <div><label style={{ fontSize: 11, color: GRAY, display: "block", marginBottom: 3 }}>Order Date</label><input type="datetime-local" value={newOrder.timestamp} onChange={(e) => setNewOrder({ ...newOrder, timestamp: e.target.value })} style={{ width: "100%", padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, color: DARK, boxSizing: "border-box" }} /></div>
              </div>
              <div><label style={{ fontSize: 11, color: GRAY, display: "block", marginBottom: 3 }}>Customer Email (optional)</label><input value={newOrder.userEmail} onChange={(e) => setNewOrder({ ...newOrder, userEmail: e.target.value })} placeholder="Links to a VYA account" style={{ width: "100%", padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, color: DARK, boxSizing: "border-box" }} /></div>
              {saveOrderError && <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>{saveOrderError}</p>}
              <button onClick={saveManualOrder} disabled={savingOrder || !newOrder.storeSlug || !newOrder.orderId || !newOrder.orderTotal} style={{ padding: "9px", background: PRIMARY, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: (!newOrder.storeSlug || !newOrder.orderId || !newOrder.orderTotal) ? 0.5 : 1 }}>
                {savingOrder ? "Saving…" : "Save Order"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── StoresTable ───────────────────────────────────────────────────────────────

function StoresTable({ stores }: { stores: TopStore[] }) {
  if (stores.length === 0) {
    return <p style={{ fontSize: 13, color: MUTED }}>No store data for this period.</p>;
  }

  const headerStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    padding: "8px 12px",
    textAlign: "left",
    borderBottom: `1px solid ${BORDER}`,
    background: BG_HOVER,
  };

  const cellStyle: React.CSSProperties = {
    fontSize: 13,
    color: DARK,
    padding: "9px 12px",
    borderBottom: `1px solid ${BORDER}`,
  };

  return (
    <div style={{ overflowX: "auto", border: `1px solid ${BORDER}`, borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={headerStyle}>Store</th>
            <th style={{ ...headerStyle, textAlign: "right" }}>Revenue</th>
            <th style={{ ...headerStyle, textAlign: "right" }}>Orders</th>
            <th style={{ ...headerStyle, textAlign: "right" }}>Views on VYA</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((s, i) => (
            <tr key={s.store ?? i} style={{ backgroundColor: i % 2 === 0 ? BG_CARD : BG_HOVER }}>
              <td style={{ ...cellStyle, fontWeight: 600 }}>{s.store ?? "—"}</td>
              <td style={{ ...cellStyle, textAlign: "right", fontWeight: 600 }}>{formatRevenueShort(s.revenue)}</td>
              <td style={{ ...cellStyle, textAlign: "right" }}>{s.conversions.toLocaleString()}</td>
              <td style={{ ...cellStyle, textAlign: "right" }}>{s.clicks.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
