"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/app/components/AdminNav";

const MAROON = "#5D0F17";
const CREAM = "#F7F3EA";
const MUTED = "rgba(93,15,23,0.45)";

function fmt$(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number) {
  return (n * 100).toFixed(1) + "%";
}
function fmtNum(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

type Trend = "up" | "down" | "flat";
function trend(current: number, prev: number): Trend {
  if (prev === 0) return current > 0 ? "up" : "flat";
  const delta = (current - prev) / prev;
  if (delta > 0.02) return "up";
  if (delta < -0.02) return "down";
  return "flat";
}
function trendLabel(current: number, prev: number, fmtFn: (n: number) => string) {
  if (prev === 0) return null;
  const delta = current - prev;
  const pct = ((current - prev) / prev) * 100;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${fmtFn(delta)} (${sign}${pct.toFixed(0)}%) vs prev period`;
}

function TrendBadge({ current, prev, fmtFn }: { current: number; prev: number; fmtFn: (n: number) => string }) {
  const t = trend(current, prev);
  if (t === "flat" || prev === 0) return null;
  const label = trendLabel(current, prev, fmtFn);
  const color = t === "up" ? "#15803d" : "#b91c1c";
  const bg = t === "up" ? "#f0fdf4" : "#fef2f2";
  const arrow = t === "up" ? "↑" : "↓";
  return (
    <span style={{ fontSize: 11, background: bg, color, padding: "2px 7px", borderRadius: 20, fontWeight: 600 }}>
      {arrow} {label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  sub,
  trend: trendEl,
  note,
  wide,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: React.ReactNode;
  note?: string;
  wide?: boolean;
}) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: "24px 28px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      gridColumn: wide ? "span 2" : undefined,
    }}>
      <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 36, fontWeight: 700, color: MAROON, margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>{sub}</p>}
      {trendEl && <div style={{ marginTop: 2 }}>{trendEl}</div>}
      {note && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, marginTop: 4, borderTop: "1px solid #f3f4f6", paddingTop: 8 }}>{note}</p>}
    </div>
  );
}

function MiniSparkline({ data }: { data: { week: string; gmv: number }[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.gmv), 1);
  const w = 240;
  const h = 52;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (d.gmv / max) * (h - 6) - 3;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={MAROON}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.7}
      />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - (d.gmv / max) * (h - 6) - 3;
        return <circle key={i} cx={x} cy={y} r={3} fill={MAROON} opacity={0.6} />;
      })}
    </svg>
  );
}

type Metrics = {
  gmv: { total: number; last7d: number; prev7d: number; last30d: number; prev30d: number };
  conversionRate: { allTime: number; last7d: number; prev7d: number; totalClicks: number; totalConversions: number };
  insiderConversion: { rate: number; approvedPilots: number; insiderMembers: number };
  wau: { current: number; prev: number };
  mau: { current: number; prev: number; totalEverActive: number };
  stickiness: { current: number; prev: number };
  saveToPurchase: { rate: number; totalSavers: number; saversBought: number };
  revenuePerUser: { value: number; buyingUsers: number };
  gmvByWeek: { week: string; gmv: number }[];
  users: { registered: number; waitlist: number };
  activityBreakdown?: { clickers: number; productSavers: number; storeSavers: number; buyers: number };
};

export default function KeyMetricsPage() {
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/key-metrics")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/admin/login"; throw new Error("Unauthorized"); }
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <AdminNav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: MAROON, margin: 0 }}>Key Metrics</h1>
          <p style={{ fontSize: 14, color: MUTED, margin: "6px 0 0" }}>Platform health at a glance. Trends compare to the previous equivalent period.</p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 80, color: MUTED }}>Loading…</div>
        )}
        {error && !loading && (
          <div style={{ textAlign: "center", padding: 80, color: "#b91c1c" }}>{error}</div>
        )}

        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

            {/* ── GMV ─────────────────────────────────────────────── */}
            <section>
              <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: MUTED, margin: "0 0 14px" }}>Gross Merchandise Value</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "24px 28px", gridColumn: "span 1" }}>
                  <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED, margin: "0 0 8px" }}>All-Time GMV</p>
                  <p style={{ fontSize: 40, fontWeight: 700, color: MAROON, margin: "0 0 12px", lineHeight: 1 }}>{fmt$(data.gmv.total)}</p>
                  <MiniSparkline data={data.gmvByWeek} />
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "10px 0 0" }}>Weekly GMV — last 10 weeks</p>
                </div>
                <MetricCard
                  label="GMV — Last 7 Days"
                  value={fmt$(data.gmv.last7d)}
                  trend={<TrendBadge current={data.gmv.last7d} prev={data.gmv.prev7d} fmtFn={fmt$} />}
                  note={`Previous 7 days: ${fmt$(data.gmv.prev7d)}`}
                />
                <MetricCard
                  label="GMV — Last 30 Days"
                  value={fmt$(data.gmv.last30d)}
                  trend={<TrendBadge current={data.gmv.last30d} prev={data.gmv.prev30d} fmtFn={fmt$} />}
                  note={`Previous 30 days: ${fmt$(data.gmv.prev30d)}`}
                />
              </div>
            </section>

            {/* ── Conversion & Revenue ────────────────────────────── */}
            <section>
              <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: MUTED, margin: "0 0 14px" }}>Conversion & Revenue</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <MetricCard
                  label="Conversion Rate (7d)"
                  value={fmtPct(data.conversionRate.last7d)}
                  sub={`${fmtNum(data.conversionRate.totalConversions)} orders from ${fmtNum(data.conversionRate.totalClicks)} clicks (all time)`}
                  trend={<TrendBadge current={data.conversionRate.last7d} prev={data.conversionRate.prev7d} fmtFn={fmtPct} />}
                  note="Clicks that resulted in an attributed purchase"
                />
                <MetricCard
                  label="Revenue per Buying User"
                  value={fmt$(data.revenuePerUser.value)}
                  sub={`Across ${fmtNum(data.revenuePerUser.buyingUsers)} users who've purchased`}
                  note="Total GMV ÷ distinct users with at least one order"
                />
                <MetricCard
                  label="Save-to-Purchase Rate"
                  value={fmtPct(data.saveToPurchase.rate)}
                  sub={`${fmtNum(data.saveToPurchase.saversBought)} of ${fmtNum(data.saveToPurchase.totalSavers)} users who saved also bought`}
                  note="Users who favorited anything and later placed an order"
                />
              </div>
            </section>

            {/* ── Users ───────────────────────────────────────────── */}
            <section>
              <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: MUTED, margin: "0 0 14px" }}>Users</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <MetricCard
                  label="Registered Accounts"
                  value={fmtNum(data.users.registered)}
                  note="Total users who have created an account"
                />
                <MetricCard
                  label="Waitlist Signups"
                  value={fmtNum(data.users.waitlist)}
                  note="Total entries in pilot_access (pending + approved)"
                />
              </div>
            </section>

            {/* ── Engagement ──────────────────────────────────────── */}
            <section>
              <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: MUTED, margin: "0 0 14px" }}>Engagement & Retention</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <MetricCard
                  label="Weekly Active Users"
                  value={fmtNum(data.wau.current)}
                  trend={<TrendBadge current={data.wau.current} prev={data.wau.prev} fmtFn={fmtNum} />}
                  note="Users who signed up, clicked a product, saved something, or placed an order this week."
                />
                <MetricCard
                  label="Monthly Active Users"
                  value={fmtNum(data.mau.current)}
                  sub={`${fmtNum(data.mau.totalEverActive)} total registered users ever`}
                  trend={<TrendBadge current={data.mau.current} prev={data.mau.prev} fmtFn={fmtNum} />}
                  note="Users who signed up, clicked a product, saved something, or placed an order this month."
                />
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "24px 28px" }}>
                  <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED, margin: "0 0 8px" }}>Stickiness (WAU/MAU)</p>
                  <p style={{ fontSize: 36, fontWeight: 700, color: MAROON, margin: "0 0 6px", lineHeight: 1 }}>{fmtPct(data.stickiness.current)}</p>
                  <TrendBadge current={data.stickiness.current} prev={data.stickiness.prev} fmtFn={fmtPct} />
                  <div style={{ marginTop: 16, background: "#f9fafb", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
                      <span>Below 10%</span><span style={{ color: "#b91c1c" }}>Needs work</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      <span>10–25%</span><span style={{ color: "#92400e" }}>Okay</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      <span>Above 25%</span><span style={{ color: "#15803d" }}>Healthy</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "10px 0 0", borderTop: "1px solid #f3f4f6", paddingTop: 8 }}>How often monthly users come back weekly</p>
                </div>
              </div>
            </section>

            {/* ── Activity breakdown ──────────────────────────────── */}
            {data.activityBreakdown && (
              <section>
                <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: MUTED, margin: "0 0 14px" }}>Active User Breakdown</h2>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 28px" }}>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 16px" }}>
                    Distinct users per activity type (overlapping — a user can appear in multiple). WAU/MAU de-duplicates across all.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                    {[
                      { label: "Clicked a product", value: data.activityBreakdown.clickers },
                      { label: "Saved a product", value: data.activityBreakdown.productSavers },
                      { label: "Saved a store", value: data.activityBreakdown.storeSavers },
                      { label: "Made a purchase", value: data.activityBreakdown.buyers },
                    ].map((s) => (
                      <div key={s.label}>
                        <p style={{ fontSize: 28, fontWeight: 700, color: MAROON, lineHeight: 1, margin: "0 0 4px" }}>{fmtNum(s.value)}</p>
                        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── Insider Funnel ──────────────────────────────────── */}
            <section>
              <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: MUTED, margin: "0 0 14px" }}>VYA Insider Funnel</h2>
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "28px 32px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0 }}>
                  {[
                    { label: "Approved Pilots", value: fmtNum(data.insiderConversion.approvedPilots), note: "Users with platform access" },
                    { label: "→", value: "", note: "" },
                    { label: "Insider Members", value: fmtNum(data.insiderConversion.insiderMembers), note: "Paying subscribers" },
                    {
                      label: "Conversion Rate",
                      value: fmtPct(data.insiderConversion.rate),
                      note: "Pilots who became Insiders",
                    },
                  ].map((item, i) =>
                    item.label === "→" ? (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#d1d5db" }}>→</div>
                    ) : (
                      <div key={i} style={{ padding: "0 8px" }}>
                        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED, margin: "0 0 6px" }}>{item.label}</p>
                        <p style={{ fontSize: 32, fontWeight: 700, color: MAROON, margin: "0 0 4px", lineHeight: 1 }}>{item.value}</p>
                        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{item.note}</p>
                      </div>
                    )
                  )}
                </div>

                {/* Funnel bar */}
                <div style={{ marginTop: 24 }}>
                  <div style={{ background: "#f3f4f6", borderRadius: 8, height: 10, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 8,
                        background: `linear-gradient(90deg, ${MAROON}, rgba(93,15,23,0.5))`,
                        width: `${Math.min(data.insiderConversion.rate * 100, 100)}%`,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                    Target: 20%+ conversion from pilot → Insider
                  </p>
                </div>
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
