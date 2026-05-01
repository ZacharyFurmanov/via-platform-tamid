"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DARK       = "#09090b";
const GRAY       = "#71717a";
const MUTED_TEXT = "#a1a1aa";
const BORDER     = "#e4e4e7";
const BG_CARD    = "#ffffff";
const UP_COLOR   = "#16a34a";
const UP_BG      = "#f0fdf4";
const DN_COLOR   = "#dc2626";
const DN_BG      = "#fef2f2";
const PRIMARY_BTN = "#18181b";

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
  // Cap at ±999% — larger swings mean the comparison window has bad/missing data
  if (Math.abs(pct) > 999) return null;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${fmtFn(delta)} (${sign}${pct.toFixed(0)}%) vs prev period`;
}

function TrendBadge({ current, prev, fmtFn }: { current: number; prev: number; fmtFn: (n: number) => string }) {
  const t = trend(current, prev);
  if (t === "flat" || prev === 0) return null;
  const label = trendLabel(current, prev, fmtFn);
  const color = t === "up" ? UP_COLOR : DN_COLOR;
  const bg = t === "up" ? UP_BG : DN_BG;
  const arrow = t === "up" ? "↑" : "↓";
  return (
    <span style={{ fontSize: 11, background: bg, color, padding: "2px 7px", borderRadius: 4, fontWeight: 500 }}>
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
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: React.ReactNode;
  note?: string;
  wide?: boolean;
  href?: string;
}) {
  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, margin: 0 }}>{label}</p>
        {href && <span style={{ fontSize: 11, color: MUTED_TEXT }}>→</span>}
      </div>
      <p style={{ fontSize: 32, fontWeight: 600, color: DARK, margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: GRAY, margin: 0 }}>{sub}</p>}
      {trendEl && <div style={{ marginTop: 2 }}>{trendEl}</div>}
      {note && <p style={{ fontSize: 11, color: MUTED_TEXT, margin: 0, marginTop: 4, borderTop: `1px solid #f4f4f5`, paddingTop: 8 }}>{note}</p>}
    </>
  );
  const cardStyle: React.CSSProperties = {
    background: BG_CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    gridColumn: wide ? "span 2" : undefined,
    textDecoration: "none",
    color: "inherit",
    transition: "box-shadow 0.15s, border-color 0.15s",
    cursor: href ? "pointer" : "default",
  };
  if (href) {
    return (
      <Link href={href} style={cardStyle} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 8px rgba(0,0,0,0.06)"; (e.currentTarget as HTMLElement).style.borderColor = "#d4d4d8"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ""; (e.currentTarget as HTMLElement).style.borderColor = BORDER; }}>
        {inner}
      </Link>
    );
  }
  return <div style={cardStyle}>{inner}</div>;
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
        stroke={PRIMARY_BTN}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.7}
      />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - (d.gmv / max) * (h - 6) - 3;
        return <circle key={i} cx={x} cy={y} r={3} fill={PRIMARY_BTN} opacity={0.6} />;
      })}
    </svg>
  );
}

type Metrics = {
  gmv: { total: number; last7d: number; prev7d: number; last30d: number; prev30d: number };
  totalOrders: { allTime: number; last7d: number; prev7d: number; last30d: number; prev30d: number };
  conversionRate: { allTime: number; last7d: number; prev7d: number; totalClicks: number; totalConversions: number; periodClicks: number; periodConversions: number; periodRate: number };
  wau: { current: number; prev: number };
  mau: { current: number; prev: number; totalEverActive: number };
  stickiness: { current: number; prev: number };
  returningUsers: { last7d: number; last30d: number };
  buyerRetention: { totalBuyers: number; returnedAfterPurchase: number; boughtAgain: number; returnRate: number | null; repeatPurchaseRate: number | null };
  saveToPurchase: { rate: number; totalSavers: number; saversBought: number };
  revenuePerUser: { value: number; buyingUsers: number };
  gmvByWeek: { week: string; gmv: number }[];
  totalCommission: number;
  users: { registered: number; waitlist: number; approved: number };
  waitlistByMonth: { month: string; signups: number; approved: number }[];
  activityBreakdown?: { clickers: number; productSavers: number; storeSavers: number; buyers: number };
  emailCtr?: { opens7d: number; clicks7d: number; ctr7d: number; opensPrev7d: number; clicksPrev7d: number; ctrPrev7d: number; opensPeriod: number; clicksPeriod: number; ctrPeriod: number; opensAll: number; clicksAll: number; ctrAll: number };
  period?: { start: string; end: string; isMonth: boolean; isAllTime: boolean; label: string };
};

// Launch date: March 19, 2026
const LAUNCH_YEAR = 2026;
const LAUNCH_MONTH = 3; // March (1-indexed)

function getMonthOptions() {
  const now = new Date();
  const options: { label: string; value: string }[] = [
    { label: "All Time", value: "alltime" },
  ];
  // Generate months from current back to March 2026
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth() + 1; // 1-indexed
  while (y > LAUNCH_YEAR || (y === LAUNCH_YEAR && m >= LAUNCH_MONTH)) {
    const value = `${y}-${String(m).padStart(2, "0")}`;
    const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
    options.push({ label, value });
    m--;
    if (m === 0) { m = 12; y--; }
  }
  options.push({ label: "Rolling (30d)", value: "" });
  return options;
}

export default function KeyMetricsPage() {
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const monthOptions = getMonthOptions();

  useEffect(() => {
    setLoading(true);
    setData(null);
    const url = selectedMonth === "alltime"
      ? "/api/admin/key-metrics?alltime=true"
      : selectedMonth
        ? `/api/admin/key-metrics?month=${selectedMonth}`
        : "/api/admin/key-metrics";
    fetch(url)
      .then((r) => {
        if (r.status === 401) { window.location.href = "/admin/login"; throw new Error("Unauthorized"); }
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [selectedMonth]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: DARK, margin: 0 }}>Key Metrics</h1>
          <p style={{ fontSize: 13, color: GRAY, margin: "6px 0 16px" }}>Platform health at a glance. Trends compare to the previous equivalent period.</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {monthOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedMonth(opt.value)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: `1px solid ${selectedMonth === opt.value ? PRIMARY_BTN : BORDER}`,
                  background: selectedMonth === opt.value ? PRIMARY_BTN : "#fff",
                  color: selectedMonth === opt.value ? "#fff" : GRAY,
                  fontSize: 12,
                  fontWeight: selectedMonth === opt.value ? 500 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 80, color: MUTED_TEXT }}>Loading…</div>
        )}
        {error && !loading && (
          <div style={{ textAlign: "center", padding: 80, color: DN_COLOR }}>{error}</div>
        )}

        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

            {/* ── GMV ─────────────────────────────────────────────── */}
            <section>
              <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, fontWeight: 500, margin: "0 0 14px" }}>Gross Merchandise Value</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                <Link href="/admin/analytics" style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "24px 28px", gridColumn: "span 1", textDecoration: "none", display: "block", transition: "box-shadow 0.15s, border-color 0.15s" }} onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 1px 8px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = "#d4d4d8"; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = BORDER; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, margin: "0 0 8px" }}>
                      {data.period?.isAllTime ? "All-Time GMV" : data.period?.isMonth ? `GMV — ${data.period.label}` : "All-Time GMV"}
                    </p>
                    <span style={{ fontSize: 11, color: MUTED_TEXT }}>→</span>
                  </div>
                  <p style={{ fontSize: 40, fontWeight: 600, color: DARK, margin: "0 0 12px", lineHeight: 1 }}>
                    {data.period?.isMonth ? fmt$(data.gmv.last30d) : fmt$(data.gmv.total)}
                  </p>
                  <MiniSparkline data={data.gmvByWeek} />
                  <p style={{ fontSize: 11, color: MUTED_TEXT, margin: "10px 0 0" }}>Weekly GMV — last 10 weeks</p>
                </Link>
                <MetricCard
                  label={data.period?.isMonth ? `Last Week of ${data.period.label}` : data.period?.isAllTime ? "GMV — Last 7 Days" : "GMV — Last 7 Days"}
                  value={fmt$(data.gmv.last7d)}
                  trend={<TrendBadge current={data.gmv.last7d} prev={data.gmv.prev7d} fmtFn={fmt$} />}
                  note={`Previous period: ${fmt$(data.gmv.prev7d)}`}
                  href="/admin/analytics"
                />
                <MetricCard
                  label={data.period?.isMonth ? `vs Previous Month` : data.period?.isAllTime ? "Since Launch" : "GMV — Last 30 Days"}
                  value={data.period?.isMonth ? fmt$(data.gmv.prev30d) : fmt$(data.gmv.last30d)}
                  trend={data.period?.isMonth ? undefined : <TrendBadge current={data.gmv.last30d} prev={data.gmv.prev30d} fmtFn={fmt$} />}
                  note={data.period?.isMonth ? `${data.period.label} total: ${fmt$(data.gmv.last30d)}` : `Previous 30 days: ${fmt$(data.gmv.prev30d)}`}
                  href="/admin/analytics"
                />
                <MetricCard
                  label="Total Commission"
                  value={fmt$(data.totalCommission)}
                  sub="All time · 7/5/3% tiers"
                  note="VYA earnings on attributed orders, excluding returns"
                  href="/admin/conversions"
                />
              </div>
            </section>

            {/* ── Total Orders ─────────────────────────────────────── */}
            {data.totalOrders && (
              <section>
                <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, fontWeight: 500, margin: "0 0 14px" }}>Total Orders</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                  <MetricCard
                    label={data.period?.isAllTime ? "All-Time Orders" : data.period?.isMonth ? `Orders — ${data.period.label}` : "All-Time Orders"}
                    value={fmtNum(data.period?.isMonth ? data.totalOrders.last30d : data.totalOrders.allTime)}
                    note="Total orders placed through VYA, excluding returns"
                    href="/admin/conversions"
                  />
                  <MetricCard
                    label="Orders — Last 7 Days"
                    value={fmtNum(data.totalOrders.last7d)}
                    trend={<TrendBadge current={data.totalOrders.last7d} prev={data.totalOrders.prev7d} fmtFn={fmtNum} />}
                    note={`Previous 7 days: ${fmtNum(data.totalOrders.prev7d)}`}
                    href="/admin/conversions"
                  />
                  <MetricCard
                    label={data.period?.isMonth ? `vs Previous Month` : "Orders — Last 30 Days"}
                    value={data.period?.isMonth ? fmtNum(data.totalOrders.prev30d) : fmtNum(data.totalOrders.last30d)}
                    trend={data.period?.isMonth ? undefined : <TrendBadge current={data.totalOrders.last30d} prev={data.totalOrders.prev30d} fmtFn={fmtNum} />}
                    note={data.period?.isMonth ? `${data.period.label} orders: ${fmtNum(data.totalOrders.last30d)}` : `Previous 30 days: ${fmtNum(data.totalOrders.prev30d)}`}
                    href="/admin/conversions"
                  />
                </div>
              </section>
            )}

            {/* ── Conversion & Revenue ────────────────────────────── */}
            <section>
              <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, fontWeight: 500, margin: "0 0 14px" }}>Conversion & Revenue</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                <MetricCard
                  label={data.period?.isMonth || data.period?.isAllTime ? `Conversion Rate — ${data.period.label}` : "Conversion Rate (7d)"}
                  value={data.period?.isMonth || data.period?.isAllTime ? fmtPct(data.conversionRate.periodRate) : fmtPct(data.conversionRate.last7d)}
                  sub={data.period?.isMonth || data.period?.isAllTime
                    ? `${fmtNum(data.conversionRate.periodConversions)} orders from ${fmtNum(data.conversionRate.periodClicks)} clicks in ${data.period?.label}`
                    : `${fmtNum(data.conversionRate.totalConversions)} orders from ${fmtNum(data.conversionRate.totalClicks)} clicks (all time)`}
                  trend={data.period?.isMonth ? <TrendBadge current={data.conversionRate.periodRate} prev={data.conversionRate.prev7d} fmtFn={fmtPct} /> : <TrendBadge current={data.conversionRate.last7d} prev={data.conversionRate.prev7d} fmtFn={fmtPct} />}
                  note="Clicks that resulted in an attributed purchase"
                  href="/admin/conversions"
                />
                <MetricCard
                  label={data.period?.isMonth || data.period?.isAllTime ? `Email CTR — ${data.period.label}` : "Email CTR (7d)"}
                  value={data.period?.isMonth || data.period?.isAllTime
                    ? fmtPct(data.emailCtr?.ctrPeriod ?? 0)
                    : fmtPct(data.emailCtr?.ctr7d ?? 0)}
                  sub={data.period?.isMonth || data.period?.isAllTime
                    ? `${fmtNum(data.emailCtr?.clicksPeriod ?? 0)} clicks from ${fmtNum(data.emailCtr?.opensPeriod ?? 0)} opens`
                    : `${fmtNum(data.emailCtr?.clicks7d ?? 0)} clicks from ${fmtNum(data.emailCtr?.opens7d ?? 0)} opens`}
                  trend={data.period?.isMonth
                    ? undefined
                    : <TrendBadge current={data.emailCtr?.ctr7d ?? 0} prev={data.emailCtr?.ctrPrev7d ?? 0} fmtFn={fmtPct} />}
                  note="Of members who opened an email, % who clicked through to the site"
                  href="/admin/emails"
                />
                <MetricCard
                  label="Revenue per Buying User"
                  value={data.period?.isMonth && data.activityBreakdown?.buyers
                    ? fmt$((data.activityBreakdown.buyers > 0 ? data.gmv.last30d / data.activityBreakdown.buyers : 0))
                    : fmt$(data.revenuePerUser.value)}
                  sub={data.period?.isMonth && data.activityBreakdown?.buyers
                    ? `Across ${fmtNum(data.activityBreakdown.buyers)} buyers in ${data.period.label}`
                    : `Across ${fmtNum(data.revenuePerUser.buyingUsers)} users who've purchased`}
                  note="Period GMV ÷ distinct buyers in the period"
                  href="/admin/customers"
                />
                <MetricCard
                  label="Save-to-Purchase Rate"
                  value={fmtPct(data.saveToPurchase.rate)}
                  sub={`${fmtNum(data.saveToPurchase.saversBought)} of ${fmtNum(data.saveToPurchase.totalSavers)} users who saved also bought`}
                  note="All-time: users who favorited anything and later placed an order"
                  href="/admin/customers"
                />
              </div>
            </section>

            {/* ── Users ───────────────────────────────────────────── */}
            <section>
              <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, fontWeight: 500, margin: "0 0 14px" }}>Users</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <MetricCard
                  label="Registered Accounts"
                  value={fmtNum(data.users.registered)}
                  note="Total users who have created an account"
                  href="/admin/customers"
                />
                <MetricCard
                  label="Waitlist Signups"
                  value={fmtNum(data.users.waitlist)}
                  note="Total entries in pilot_access (pending + approved)"
                  href="/admin/customers"
                />
              </div>
            </section>

            {/* ── Waitlist Growth ─────────────────────────────────── */}
            {data.waitlistByMonth.length > 0 && (
              <section>
                <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, fontWeight: 500, margin: "0 0 14px" }}>Waitlist Growth</h2>
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "24px 28px" }}>
                  {(() => {
                    // Filter months to match selected period
                    const visibleMonths = data.period?.isMonth
                      ? data.waitlistByMonth.filter((m) => m.month === selectedMonth)
                      : data.waitlistByMonth;

                    const currentMonthData = visibleMonths[visibleMonths.length - 1];
                    const prevMonthData = data.period?.isMonth
                      ? data.waitlistByMonth[data.waitlistByMonth.findIndex((m) => m.month === selectedMonth) - 1]
                      : visibleMonths[visibleMonths.length - 2];

                    const totalApproved = data.waitlistByMonth.reduce((s, m) => s + m.approved, 0);
                    const totalPending = data.users.waitlist - totalApproved;

                    return (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                          {data.period?.isMonth ? (
                            <>
                              <div>
                                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, margin: "0 0 6px" }}>Signups — {data.period.label}</p>
                                <p style={{ fontSize: 32, fontWeight: 600, color: DARK, margin: "0 0 4px", lineHeight: 1 }}>{fmtNum(currentMonthData?.signups ?? 0)}</p>
                                {prevMonthData && <TrendBadge current={currentMonthData?.signups ?? 0} prev={prevMonthData.signups} fmtFn={fmtNum} />}
                              </div>
                              <div>
                                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, margin: "0 0 6px" }}>Approved — {data.period.label}</p>
                                <p style={{ fontSize: 32, fontWeight: 600, color: DARK, margin: "0 0 4px", lineHeight: 1 }}>{fmtNum(currentMonthData?.approved ?? 0)}</p>
                                <p style={{ fontSize: 12, color: GRAY, margin: 0 }}>of {fmtNum(currentMonthData?.signups ?? 0)} signups</p>
                              </div>
                              <div>
                                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, margin: "0 0 6px" }}>All-Time Waitlist</p>
                                <p style={{ fontSize: 32, fontWeight: 600, color: DARK, margin: "0 0 4px", lineHeight: 1 }}>{fmtNum(data.users.waitlist)}</p>
                                <p style={{ fontSize: 12, color: GRAY, margin: 0 }}>{fmtNum(totalApproved)} approved · {fmtNum(totalPending)} pending</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, margin: "0 0 6px" }}>Total on Waitlist</p>
                                <p style={{ fontSize: 32, fontWeight: 600, color: DARK, margin: "0 0 4px", lineHeight: 1 }}>{fmtNum(data.users.waitlist)}</p>
                                <p style={{ fontSize: 12, color: GRAY, margin: 0 }}>{fmtNum(totalApproved)} approved · {fmtNum(totalPending)} pending</p>
                              </div>
                              <div>
                                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, margin: "0 0 6px" }}>This Month</p>
                                <p style={{ fontSize: 32, fontWeight: 600, color: DARK, margin: "0 0 4px", lineHeight: 1 }}>{fmtNum(currentMonthData?.signups ?? 0)}</p>
                                {prevMonthData && <TrendBadge current={currentMonthData?.signups ?? 0} prev={prevMonthData.signups} fmtFn={fmtNum} />}
                              </div>
                              <div>
                                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, margin: "0 0 6px" }}>Avg / Month</p>
                                <p style={{ fontSize: 32, fontWeight: 600, color: DARK, margin: "0 0 4px", lineHeight: 1 }}>
                                  {fmtNum(Math.round(data.users.waitlist / Math.max(data.waitlistByMonth.length, 1)))}
                                </p>
                                <p style={{ fontSize: 12, color: GRAY, margin: 0 }}>across {data.waitlistByMonth.length} month{data.waitlistByMonth.length !== 1 ? "s" : ""}</p>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Bar chart — only show when not filtered to a single month */}
                        {!data.period?.isMonth && (
                          <div style={{ overflowX: "auto" }}>
                            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, minWidth: visibleMonths.length * 56, height: 80 }}>
                              {(() => {
                                const maxVal = Math.max(...visibleMonths.map((m) => m.signups), 1);
                                return visibleMonths.map((m) => {
                                  const barH = Math.max((m.signups / maxVal) * 64, 4);
                                  const label = new Date(m.month + "-02").toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
                                  return (
                                    <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                      <span style={{ fontSize: 10, color: MUTED_TEXT, fontWeight: 600 }}>{m.signups}</span>
                                      <div style={{ width: "100%", height: barH, background: PRIMARY_BTN, borderRadius: "3px 3px 0 0", opacity: 0.8 }} title={`${label}: ${m.signups} signups, ${m.approved} approved`} />
                                      <span style={{ fontSize: 9, color: MUTED_TEXT, whiteSpace: "nowrap" }}>{label}</span>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                        <p style={{ fontSize: 11, color: MUTED_TEXT, margin: "12px 0 0", borderTop: `1px solid #f4f4f5`, paddingTop: 10 }}>
                          {data.period?.isMonth ? `Waitlist activity for ${data.period.label}.` : "Signups per month since launch. Hover bars for approved count."}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </section>
            )}

            {/* ── Waitlist Funnel ─────────────────────────────────── */}
            <section>
              <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, fontWeight: 500, margin: "0 0 14px" }}>Waitlist Funnel</h2>
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "24px 28px" }}>
                {(() => {
                  const steps = [
                    { label: "Waitlist Signups", value: data.users.waitlist, note: "Total entries in pilot_access" },
                    { label: "Approved", value: data.users.approved, note: "Granted platform access" },
                    { label: "Registered Accounts", value: data.users.registered, note: "Created a VYA account" },
                    { label: "Ever Active", value: data.mau.totalEverActive, note: "Clicked, saved, or ordered at least once" },
                  ];
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: 0 }}>
                      {steps.map((step, i) => {
                        const prev = i > 0 ? steps[i - 1].value : null;
                        const pct = prev && prev > 0 ? ((step.value / prev) * 100).toFixed(0) : null;
                        return (
                          <div key={step.label} style={{ display: "flex", alignItems: "stretch" }}>
                            <div style={{ flex: 1, padding: "0 20px", borderRight: i < steps.length - 1 ? "1px solid #f4f4f5" : "none" }}>
                              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, margin: "0 0 6px" }}>{step.label}</p>
                              <p style={{ fontSize: 32, fontWeight: 600, color: DARK, margin: "0 0 4px", lineHeight: 1 }}>{fmtNum(step.value)}</p>
                              {pct !== null && (
                                <span style={{ fontSize: 11, background: UP_BG, color: UP_COLOR, padding: "2px 7px", borderRadius: 4, fontWeight: 500 }}>
                                  {pct}% of prev
                                </span>
                              )}
                              <p style={{ fontSize: 11, color: MUTED_TEXT, margin: "8px 0 0" }}>{step.note}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </section>

            {/* ── Engagement ──────────────────────────────────────── */}
            <section>
              <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, fontWeight: 500, margin: "0 0 14px" }}>Engagement & Retention</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <MetricCard
                  label="Weekly Active Users"
                  value={fmtNum(data.wau.current)}
                  trend={<TrendBadge current={data.wau.current} prev={data.wau.prev} fmtFn={fmtNum} />}
                  note={`Registered users who clicked a product, saved something, viewed a page, or placed an order ${data.period?.isMonth ? `in the last 7 days of ${data.period.label}` : "this week"}.`}
                  href="/admin/analytics"
                />
                <MetricCard
                  label={data.period?.isAllTime ? "Total Active Users" : "Monthly Active Users"}
                  value={fmtNum(data.mau.current)}
                  sub={`${fmtNum(data.users.registered)} total registered users`}
                  trend={data.period?.isAllTime ? undefined : <TrendBadge current={data.mau.current} prev={data.mau.prev} fmtFn={fmtNum} />}
                  note={`Registered users who clicked a product, saved something, viewed a page, or placed an order ${data.period?.isAllTime ? "since launch" : data.period?.isMonth ? `in ${data.period.label}` : "this month"}.`}
                  href="/admin/analytics"
                />
                <MetricCard
                  label="Returning Users (30d)"
                  value={fmtNum(data.returningUsers.last30d)}
                  sub={`${fmtNum(data.returningUsers.last7d)} returned this week`}
                  note="Registered users active in the period who have visited on 2+ different days"
                  href="/admin/customers"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 16 }}>
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "24px 28px" }}>
                  <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, margin: "0 0 8px" }}>Stickiness (WAU/MAU)</p>
                  <p style={{ fontSize: 32, fontWeight: 600, color: DARK, margin: "0 0 6px", lineHeight: 1 }}>{fmtPct(data.stickiness.current)}</p>
                  <TrendBadge current={data.stickiness.current} prev={data.stickiness.prev} fmtFn={fmtPct} />
                  <div style={{ marginTop: 16, background: "#f4f4f5", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: GRAY }}>
                      <span>Below 10%</span><span style={{ color: "#b91c1c" }}>Needs work</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: GRAY, marginTop: 2 }}>
                      <span>10–25%</span><span style={{ color: "#92400e" }}>Okay</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: GRAY, marginTop: 2 }}>
                      <span>Above 25%</span><span style={{ color: "#15803d" }}>Healthy</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: MUTED_TEXT, margin: "10px 0 0", borderTop: `1px solid #f4f4f5`, paddingTop: 8 }}>How often monthly users come back weekly</p>
                </div>

                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "24px 28px" }}>
                  <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, margin: "0 0 16px" }}>
                    Buyer Retention — {data.period?.label ?? "Last 30 Days"}
                  </p>

                  {/* Came back after purchase */}
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 12, color: GRAY, margin: "0 0 4px" }}>Came back after buying</p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                      <p style={{ fontSize: 30, fontWeight: 600, color: DARK, margin: 0, lineHeight: 1 }}>
                        {data.buyerRetention.returnRate === null ? "—" : fmtPct(data.buyerRetention.returnRate)}
                      </p>
                      <p style={{ fontSize: 12, color: MUTED_TEXT, margin: 0 }}>
                        {fmtNum(data.buyerRetention.returnedAfterPurchase)} of {fmtNum(data.buyerRetention.totalBuyers)} buyers
                      </p>
                    </div>
                    <div style={{ background: "#f4f4f5", borderRadius: 6, padding: "8px 12px" }}>
                      {[
                        { label: "Below 30%", verdict: "Needs work", color: "#b91c1c", threshold: null },
                        { label: "30–60%",    verdict: "Okay",       color: "#92400e", threshold: null },
                        { label: "Above 60%", verdict: "Healthy",    color: "#15803d", threshold: null },
                      ].map((row) => (
                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: GRAY, marginBottom: 2 }}>
                          <span>{row.label}</span><span style={{ color: row.color, fontWeight: 600 }}>{row.verdict}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ height: 1, background: "#f4f4f5", margin: "0 0 14px" }} />

                  {/* Bought again */}
                  <div>
                    <p style={{ fontSize: 12, color: GRAY, margin: "0 0 4px" }}>Bought again</p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                      <p style={{ fontSize: 30, fontWeight: 600, color: DARK, margin: 0, lineHeight: 1 }}>
                        {data.buyerRetention.repeatPurchaseRate === null ? "—" : fmtPct(data.buyerRetention.repeatPurchaseRate)}
                      </p>
                      <p style={{ fontSize: 12, color: MUTED_TEXT, margin: 0 }}>
                        {fmtNum(data.buyerRetention.boughtAgain)} of {fmtNum(data.buyerRetention.totalBuyers)} buyers
                      </p>
                    </div>
                    <div style={{ background: "#f4f4f5", borderRadius: 6, padding: "8px 12px" }}>
                      {[
                        { label: "Below 5%",  verdict: "Needs work", color: "#b91c1c" },
                        { label: "5–15%",     verdict: "Okay",       color: "#92400e" },
                        { label: "Above 15%", verdict: "Healthy",    color: "#15803d" },
                      ].map((row) => (
                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: GRAY, marginBottom: 2 }}>
                          <span>{row.label}</span><span style={{ color: row.color, fontWeight: 600 }}>{row.verdict}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p style={{ fontSize: 11, color: MUTED_TEXT, margin: "12px 0 0", borderTop: `1px solid #f4f4f5`, paddingTop: 10 }}>
                    Of buyers in this period. Higher is better.
                  </p>
                </div>
              </div>
            </section>

            {/* ── Activity breakdown ──────────────────────────────── */}
            {data.activityBreakdown && (
              <section>
                <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED_TEXT, fontWeight: 500, margin: "0 0 14px" }}>
                  Active User Breakdown — {data.period?.label ?? "Last 30 Days"}
                </h2>
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "20px 28px" }}>
                  <p style={{ fontSize: 12, color: MUTED_TEXT, margin: "0 0 16px" }}>
                    Distinct logged-in users who took each action during this period. A user can appear in multiple categories. "Clicked a product link" = tapped through to a store; "Favorited" = saved to their wishlist.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                    {[
                      { label: "Clicked a product link", value: data.activityBreakdown.clickers, href: "/admin/analytics" },
                      { label: "Favorited a product", value: data.activityBreakdown.productSavers, href: "/admin/customers" },
                      { label: "Favorited a store", value: data.activityBreakdown.storeSavers, href: "/admin/customers" },
                      { label: "Placed an order", value: data.activityBreakdown.buyers, href: "/admin/conversions" },
                    ].map((s) => (
                      <Link key={s.label} href={s.href} style={{ textDecoration: "none", display: "block", padding: "8px", borderRadius: 8, transition: "background 0.15s" }} onMouseEnter={e => (e.currentTarget.style.background = "#f4f4f5")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                        <p style={{ fontSize: 28, fontWeight: 600, color: DARK, lineHeight: 1, margin: "0 0 4px" }}>{fmtNum(s.value)}</p>
                        <p style={{ fontSize: 12, color: MUTED_TEXT, margin: 0 }}>{s.label} →</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}


          </div>
        )}
      </div>
    </div>
  );
}
