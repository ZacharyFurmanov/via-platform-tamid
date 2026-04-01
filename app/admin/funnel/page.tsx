"use client";

import React, { useEffect, useState, useCallback } from "react";
import AdminNav from "@/app/components/AdminNav";

type DateRange = "7d" | "30d" | "all";

type PageFunnelEntry = {
  pageType: string;
  views: number;
};

type DropOffProduct = {
  productId: string;
  name: string;
  store: string;
  views: number;
  clicks: number;
};

type FunnelData = {
  pageFunnel: PageFunnelEntry[];
  dropOffProducts: DropOffProduct[];
  kpis: {
    totalViews: number;
    totalClicks: number;
    totalConversions: number;
  };
};

const MAROON = "#5D0F17";
const CREAM = "#F7F3EA";

function RangeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

export default function FunnelPage() {
  const [range, setRange] = useState<DateRange>("30d");
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (r: DateRange) => {
    setLoading(true);
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  const pageMap = Object.fromEntries((data?.pageFunnel ?? []).map((p) => [p.pageType, p.views]));

  const stages = [
    { label: "Homepage", sub: "landing", count: pageMap["homepage"] ?? 0 },
    { label: "Browse / Category", sub: "exploring", count: (pageMap["browse"] ?? 0) + (pageMap["category"] ?? 0) },
    { label: "Store Page", sub: "store visit", count: pageMap["store"] ?? 0 },
    { label: "Product Detail", sub: "product view", count: data?.kpis.totalViews ?? 0 },
    { label: "Clicked to Store", sub: "buy intent", count: data?.kpis.totalClicks ?? 0 },
    { label: "Completed Purchase", sub: "conversion", count: data?.kpis.totalConversions ?? 0 },
  ];

  const hasPageData = (pageMap["homepage"] ?? 0) + (pageMap["browse"] ?? 0) + (pageMap["category"] ?? 0) + (pageMap["store"] ?? 0) > 0;
  const visibleStages = hasPageData ? stages : stages.slice(3);
  const max = Math.max(...visibleStages.map((s) => s.count), 1);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: CREAM, fontFamily: "sans-serif" }}>
      <AdminNav />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: MAROON, margin: 0 }}>Customer Drop-Off Funnel</h1>
          <div style={{ display: "flex", gap: 8 }}>
            {(["7d", "30d", "all"] as DateRange[]).map((r) => (
              <RangeButton key={r} label={r === "all" ? "All time" : r} active={range === r} onClick={() => setRange(r)} />
            ))}
          </div>
        </div>

        {loading && (
          <p style={{ color: MAROON, opacity: 0.5, fontSize: 13 }}>Loading…</p>
        )}

        {error && (
          <p style={{ color: "#b91c1c", fontSize: 13 }}>Error: {error}</p>
        )}

        {!loading && data && (
          <>
            {/* Funnel */}
            <div style={{ backgroundColor: "white", borderRadius: 12, padding: "28px 32px", marginBottom: 24 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 20px" }}>
                Where We&apos;re Losing People
              </h2>

              {!hasPageData && (
                <p style={{ fontSize: 11, color: MAROON, opacity: 0.45, marginBottom: 16 }}>
                  Page-level tracking (homepage, category, store) is still collecting data — check back soon.
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {visibleStages.map((stage, i) => {
                  const pct = max > 0 ? Math.round((stage.count / max) * 100) : 0;
                  const prev = i > 0 ? visibleStages[i - 1].count : null;
                  const dropPct = prev && prev > 0 && stage.count <= prev
                    ? Math.round((1 - stage.count / prev) * 100)
                    : null;
                  return (
                    <div key={stage.label}>
                      {dropPct !== null && (
                        <div style={{ paddingLeft: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: dropPct > 70 ? "#b91c1c" : dropPct > 40 ? "#d97706" : "#16a34a" }}>
                            ↓ {dropPct}% dropped off here
                          </span>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ flex: 1, height: 40, backgroundColor: "#f0ebe0", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                          <div style={{ width: `${pct}%`, height: "100%", backgroundColor: MAROON, borderRadius: 6, opacity: 0.15 + (pct / 100) * 0.7, transition: "width 0.4s ease" }} />
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px" }}>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: MAROON }}>{stage.label}</span>
                              <span style={{ fontSize: 11, color: MAROON, opacity: 0.45, marginLeft: 8 }}>{stage.sub}</span>
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 700, color: MAROON, minWidth: 60, textAlign: "right" }}>
                          {stage.count.toLocaleString()}
                        </span>
                        <span style={{ fontSize: 12, color: MAROON, opacity: 0.45, minWidth: 38, textAlign: "right" }}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Most Viewed Without Buying */}
            {(data.dropOffProducts ?? []).length > 0 && (
              <div style={{ backgroundColor: "white", borderRadius: 12, padding: "28px 32px" }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 16px" }}>
                  Most Viewed Without Buying — Focus Here
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(data.dropOffProducts ?? []).map((p) => {
                    const clickRate = p.views > 0 ? Math.round((p.clicks / p.views) * 100) : 0;
                    const isLow = clickRate < 20;
                    return (
                      <div key={p.productId} style={{ display: "flex", alignItems: "center", gap: 12, backgroundColor: CREAM, borderRadius: 8, padding: "10px 14px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, color: MAROON, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.name || p.productId}
                          </p>
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: MAROON, opacity: 0.5 }}>{p.store}</p>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ margin: 0, fontSize: 12, color: MAROON }}>{p.views} views → {p.clicks} clicks</p>
                          <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 700, color: isLow ? "#b91c1c" : "#16a34a" }}>
                            {clickRate}% click-through
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
