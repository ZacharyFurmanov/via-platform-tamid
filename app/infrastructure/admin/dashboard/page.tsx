"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, PageHeader, EmptyState } from "@/app/store/ui";
import { BarChart3 } from "lucide-react";

type Overview = {
 periodDays: number | "all";
 revenueCents: number;
 orders: number;
 aovCents: number;
 revenueByDay: { day: string; cents: number }[];
 inventory: { active: number; draft: number; sold: number; activeValueCents: number };
 topBrands: { brand: string; sold: number; revenueCents: number }[];
 topCategories: { category: string; sold: number; revenueCents: number }[];
 recentSales: { title: string; amountCents: number; at: string | null }[];
 customers: number;
 buyers: number;
 newBuyers: number;
 returningBuyers: number;
 prior: { revenueCents: number; orders: number };
 sessions: number;
 productViews: number;
 favorites: number;
 topViewed: { itemId: string; title: string; count: number }[];
 topFavorited: { itemId: string; title: string; count: number }[];
 topSearches: { query: string; count: number }[];
};

type ChannelRow = { channel: string; clicks: number; orders: number; sales: number; convPct: number; aov: number };
type Traffic = { total: number; byType: { type: string; sessions: number }[]; topSources: { source: string; type: string; sessions: number }[] };
type Perf = { rows: ChannelRow[]; attributedSales: number; totalSales: number; traffic: Traffic };

const money = (c: number) => `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const dollars = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—");
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
const B = "/infrastructure/admin";

const TYPE_COLOR: Record<string, string> = { Direct: "#9AA0A6", Search: "#5D0F17", Social: "#A33A44", Email: "#C2A14D", Referral: "#3F6F6F", Paid: "#8C6BA8" };
const typeColor = (t: string) => TYPE_COLOR[t] || "#9AA0A6";
const CHANNEL_COLORS = ["#5D0F17", "#A33A44", "#C9777E", "#3F6F6F", "#7BA7A7", "#C2A14D", "#8C6BA8", "#9AA0A6"];

const TABS = [
 { key: "overview", label: "Overview" },
 { key: "sales", label: "Sales" },
 { key: "traffic", label: "Traffic" },
 { key: "demand", label: "Demand" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function Stat({ label, value, hint, delta }: { label: string; value: React.ReactNode; hint?: string; delta?: number | null }) {
 return (
 <Card className="p-4">
 <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-400">{label}</p>
 <p className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">{value}</p>
 {delta != null ? (
 <p className={`mt-0.5 text-[11px] font-medium ${delta >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}% vs prior</p>
 ) : hint ? (
 <p className="mt-0.5 text-[11px] text-stone-400">{hint}</p>
 ) : null}
 </Card>
 );
}

function CardTitle({ children }: { children: React.ReactNode }) {
 return <p className="mb-3 text-[13px] font-medium text-stone-700">{children}</p>;
}

function RevenueChart({ data }: { data: { day: string; cents: number }[] }) {
 if (data.length < 2) return null;
 const max = Math.max(1, ...data.map((d) => d.cents));
 return (
 <div>
 <div className="flex h-32 items-end gap-1">
 {data.map((d, i) => (
 <div key={i} className="group relative flex-1" title={`${d.day}: ${money(d.cents)}`}>
 <div className="w-full rounded-t bg-[#5D0F17]/80 transition group-hover:bg-[#5D0F17]" style={{ height: `${Math.max(2, (d.cents / max) * 100)}%` }} />
 </div>
 ))}
 </div>
 <div className="mt-1.5 flex justify-between text-[10px] text-stone-400"><span>{data[0].day}</span><span>{data[data.length - 1].day}</span></div>
 </div>
 );
}

function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
 const top = Math.max(1, steps[0].value);
 return (
 <div className="space-y-3">
 {steps.map((s, i) => {
 const fromPrev = i === 0 ? null : pct(s.value, steps[i - 1].value);
 return (
 <div key={s.label}>
 <div className="mb-1 flex items-baseline justify-between text-[12px]">
 <span className="text-stone-600">{s.label}</span>
 <span className="tabular-nums text-stone-500">{s.value.toLocaleString()}{fromPrev !== null && <span className="ml-1.5 text-stone-400">{fromPrev}% of prior</span>}</span>
 </div>
 <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
 <div className="h-full rounded-full bg-[#5D0F17]/80" style={{ width: `${Math.max(2, (s.value / top) * 100)}%` }} />
 </div>
 </div>
 );
 })}
 </div>
 );
}

// A brand/category leaderboard with revenue bars.
function Leaderboard({ rows }: { rows: { name: string; sold: number; revenueCents: number }[] }) {
 if (rows.length === 0) return <p className="py-4 text-center text-[12px] text-stone-400">No sales in this period.</p>;
 const max = Math.max(1, ...rows.map((r) => r.revenueCents));
 return (
 <div className="space-y-2.5">
 {rows.map((r) => (
 <div key={r.name}>
 <div className="mb-1 flex items-center justify-between text-[13px]">
 <span className="truncate text-stone-700">{r.name}</span>
 <span className="shrink-0 tabular-nums text-stone-900">{money(r.revenueCents)} <span className="text-stone-400">· {r.sold}</span></span>
 </div>
 <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
 <div className="h-full rounded-full bg-[#5D0F17]/70" style={{ width: `${Math.max(3, (r.revenueCents / max) * 100)}%` }} />
 </div>
 </div>
 ))}
 </div>
 );
}

export default function AnalyticsPage() {
 const [range, setRange] = useState<"30" | "90" | "all">("30");
 const [tab, setTab] = useState<TabKey>("overview");
 const [data, setData] = useState<Overview | null>(null);
 const [perf, setPerf] = useState<Perf | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 let active = true;
 (async () => {
 setLoading(true);
 try {
 const [ov, pf] = await Promise.all([
 fetch(`/api/store/analytics/overview?days=${range}`).then((r) => (r.ok ? r.json() : null)),
 fetch(`/api/store/performance?days=${range}`).then((r) => (r.ok ? r.json() : null)),
 ]);
 if (active) { if (ov) setData(ov); setPerf(pf); }
 } catch { /* keep prior */ }
 if (active) setLoading(false);
 })();
 return () => { active = false; };
 }, [range]);

 const nothing = data && data.revenueCents === 0 && data.orders === 0 && data.inventory.active === 0 && data.inventory.sold === 0 && data.customers === 0;

 // Derived rates + deltas — all from data we already collect.
 const sellThrough = data ? pct(data.inventory.sold, data.inventory.sold + data.inventory.active) : 0;
 const convRate = data && data.sessions > 0 ? (data.orders / data.sessions) * 100 : 0;
 const saveRate = data ? pct(data.favorites, data.productViews) : 0;
 const showDelta = data && data.periodDays !== "all";
 const revDelta = showDelta && data!.prior.revenueCents > 0 ? Math.round(((data!.revenueCents - data!.prior.revenueCents) / data!.prior.revenueCents) * 100) : null;
 const ordDelta = showDelta && data!.prior.orders > 0 ? Math.round(((data!.orders - data!.prior.orders) / data!.prior.orders) * 100) : null;

 const traffic = perf?.traffic || { total: 0, byType: [], topSources: [] };
 const channels = (perf?.rows || []).slice().sort((a, b) => b.clicks - a.clicks);
 const attributed = perf?.attributedSales || 0;
 const totalSales = perf?.totalSales || 0;
 const attribPct = pct(attributed, totalSales);
 const hasTraffic = traffic.total > 0 || channels.length > 0;

 return (
 <div className="mx-auto max-w-4xl px-6 py-8">
 <PageHeader
 title="Analytics"
 subtitle="Your store’s business — sales, demand, traffic, and what converts."
 actions={
 <div className="inline-flex rounded-lg border border-stone-200 p-0.5 text-[12px]">
 {(["30", "90", "all"] as const).map((r) => (
 <button key={r} onClick={() => setRange(r)} className={`rounded-md px-3 py-1 transition ${range === r ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-800"}`}>
 {r === "all" ? "All time" : `${r}d`}
 </button>
 ))}
 </div>
 }
 />

 {loading && !data ? (
 <div className="py-24 text-center text-sm text-stone-400">Loading…</div>
 ) : nothing ? (
 <EmptyState icon={<BarChart3 size={28} strokeWidth={1.5} />} title="No activity yet" body="Once you publish listings and make sales, your revenue, demand, and traffic will show up here." />
 ) : data ? (
 <>
 {/* tab bar */}
 <div className="mb-6 flex gap-1 border-b border-stone-200">
 {TABS.map((t) => (
 <button key={t.key} onClick={() => setTab(t.key)} className={`relative px-3.5 py-2 text-[13px] font-medium transition ${tab === t.key ? "text-stone-900" : "text-stone-400 hover:text-stone-600"}`}>
 {t.label}
 {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-stone-900" />}
 </button>
 ))}
 </div>

 {/* ── OVERVIEW ── */}
 {tab === "overview" && (
 <div className="space-y-6">
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
 <Stat label="Revenue" value={money(data.revenueCents)} hint={data.periodDays === "all" ? "all time" : `last ${data.periodDays}d`} delta={revDelta} />
 <Stat label="Orders" value={data.orders.toLocaleString()} delta={ordDelta} />
 <Stat label="Avg. order" value={data.orders ? money(data.aovCents) : "—"} />
 <Stat label="Items sold" value={data.inventory.sold.toLocaleString()} />
 </div>

 <div className="grid grid-cols-3 gap-3">
 <Stat label="Conversion" value={data.sessions ? `${convRate.toFixed(convRate < 10 ? 1 : 0)}%` : "—"} hint="orders ÷ sessions" />
 <Stat label="Sell-through" value={data.inventory.sold + data.inventory.active ? `${sellThrough}%` : "—"} hint="sold ÷ listed" />
 <Stat label="Save rate" value={data.productViews ? `${saveRate}%` : "—"} hint="favorites ÷ views" />
 </div>

 {data.revenueByDay.length >= 2 && (
 <Card className="p-5"><CardTitle>Revenue over time</CardTitle><RevenueChart data={data.revenueByDay} /></Card>
 )}

 {(data.productViews > 0 || data.favorites > 0 || data.orders > 0) && (
 <Card className="p-5">
 <CardTitle>Demand funnel</CardTitle>
 <Funnel steps={[{ label: "Product views", value: data.productViews }, { label: "Favorites", value: data.favorites }, { label: "Orders", value: data.orders }]} />
 </Card>
 )}

 <div className="grid gap-4 sm:grid-cols-2">
 <Card className="p-5">
 <CardTitle>Inventory</CardTitle>
 <div className="space-y-2 text-[13px]">
 <div className="flex justify-between"><span className="text-stone-500">Active listings</span><Link href={`${B}/inventory`} className="font-medium tabular-nums text-stone-900 hover:underline">{data.inventory.active}</Link></div>
 <div className="flex justify-between"><span className="text-stone-500">Inventory value</span><span className="font-medium tabular-nums text-stone-900">{money(data.inventory.activeValueCents)}</span></div>
 <div className="flex justify-between"><span className="text-stone-500">Drafts</span><Link href={`${B}/inventory/drafts`} className="font-medium tabular-nums text-stone-900 hover:underline">{data.inventory.draft}</Link></div>
 <div className="flex justify-between"><span className="text-stone-500">Sold (all time)</span><span className="font-medium tabular-nums text-stone-900">{data.inventory.sold}</span></div>
 </div>
 </Card>
 <Card className="p-5">
 <CardTitle>Audience</CardTitle>
 <div className="space-y-2 text-[13px]">
 <div className="flex justify-between"><span className="text-stone-500">Customers</span><Link href={`${B}/customers`} className="font-medium tabular-nums text-stone-900 hover:underline">{data.customers.toLocaleString()}</Link></div>
 <div className="flex justify-between"><span className="text-stone-500">New buyers</span><span className="font-medium tabular-nums text-stone-900">{data.newBuyers.toLocaleString()}</span></div>
 <div className="flex justify-between"><span className="text-stone-500">Returning buyers</span><span className="font-medium tabular-nums text-stone-900">{data.returningBuyers.toLocaleString()}</span></div>
 <div className="flex justify-between"><span className="text-stone-500">Sessions{data.periodDays === "all" ? "" : ` (${data.periodDays}d)`}</span><span className="font-medium tabular-nums text-stone-900">{data.sessions.toLocaleString()}</span></div>
 <div className="flex justify-between"><span className="text-stone-500">Product views</span><span className="font-medium tabular-nums text-stone-900">{data.productViews.toLocaleString()}</span></div>
 </div>
 </Card>
 </div>
 </div>
 )}

 {/* ── SALES ── */}
 {tab === "sales" && (
 <div className="space-y-6">
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
 <Stat label="Revenue" value={money(data.revenueCents)} delta={revDelta} hint={data.periodDays === "all" ? "all time" : undefined} />
 <Stat label="Orders" value={data.orders.toLocaleString()} delta={ordDelta} />
 <Stat label="Avg. order" value={data.orders ? money(data.aovCents) : "—"} />
 <Stat label="Items sold" value={data.inventory.sold.toLocaleString()} />
 </div>
 {data.revenueByDay.length >= 2 && (
 <Card className="p-5"><CardTitle>Revenue over time</CardTitle><RevenueChart data={data.revenueByDay} /></Card>
 )}
 <div className="grid gap-4 sm:grid-cols-2">
 <Card className="p-5"><CardTitle>Top brands by revenue</CardTitle><Leaderboard rows={data.topBrands.map((b) => ({ name: b.brand, sold: b.sold, revenueCents: b.revenueCents }))} /></Card>
 <Card className="p-5"><CardTitle>Top categories by revenue</CardTitle><Leaderboard rows={data.topCategories.map((c) => ({ name: c.category, sold: c.sold, revenueCents: c.revenueCents }))} /></Card>
 </div>
 <Card className="p-5">
 <CardTitle>Recent sales</CardTitle>
 {data.recentSales.length === 0 ? <p className="py-4 text-center text-[12px] text-stone-400">No sales yet.</p> : (
 <div className="space-y-2">
 {data.recentSales.map((s, i) => (
 <div key={i} className="flex items-center justify-between text-[13px]">
 <span className="max-w-[240px] truncate text-stone-700">{s.title}</span>
 <span className="shrink-0 tabular-nums text-stone-900">{money(s.amountCents)} <span className="text-stone-400">· {shortDate(s.at)}</span></span>
 </div>
 ))}
 </div>
 )}
 </Card>
 </div>
 )}

 {/* ── TRAFFIC ── */}
 {tab === "traffic" && (
 hasTraffic ? (
 <div className="space-y-4">
 {traffic.total > 0 && (
 <Card className="p-5">
 <div className="mb-3 flex items-baseline justify-between">
 <CardTitle>Where your visitors come from</CardTitle>
 <p className="text-[12px] text-stone-400"><b className="tabular-nums text-stone-700">{traffic.total.toLocaleString()}</b> sessions</p>
 </div>
 <div className="flex h-3 w-full overflow-hidden rounded-full bg-stone-100">
 {traffic.byType.map((t) => (
 <div key={t.type} title={`${t.type}: ${t.sessions.toLocaleString()}`} style={{ width: `${(t.sessions / traffic.total) * 100}%`, background: typeColor(t.type) }} />
 ))}
 </div>
 <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
 {traffic.byType.map((t) => (
 <div key={t.type} className="flex items-center gap-2 text-[12px]">
 <span className="h-2.5 w-2.5 rounded-sm" style={{ background: typeColor(t.type) }} />
 <span className="text-stone-700">{t.type}</span>
 <span className="tabular-nums text-stone-400">{t.sessions.toLocaleString()} · {pct(t.sessions, traffic.total)}%</span>
 </div>
 ))}
 </div>
 {traffic.topSources.length > 0 && (
 <div className="mt-5 border-t border-stone-100 pt-4">
 <p className="mb-2 text-[12px] font-medium text-stone-400">Top sources</p>
 <div className="space-y-1.5">
 {traffic.topSources.map((s) => (
 <div key={`${s.source}-${s.type}`} className="flex items-center gap-3 text-[13px]">
 <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: typeColor(s.type) }} />
 <span className="w-40 shrink-0 truncate text-stone-800">{s.source}</span>
 <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
 <div className="h-full rounded-full" style={{ width: `${(s.sessions / traffic.total) * 100}%`, background: typeColor(s.type) }} />
 </div>
 <span className="w-16 shrink-0 text-right tabular-nums text-stone-500">{s.sessions.toLocaleString()}</span>
 </div>
 ))}
 </div>
 </div>
 )}
 </Card>
 )}

 {totalSales > 0 && (
 <Card className="p-5">
 <div className="flex items-baseline justify-between">
 <div>
 <CardTitle>Sales attributed to marketing</CardTitle>
 <p className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">{dollars(attributed)} <span className="text-base font-normal text-stone-400">of {dollars(totalSales)} total</span></p>
 </div>
 <span className="text-2xl font-semibold tabular-nums text-stone-900">{attribPct}%</span>
 </div>
 <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
 <div className="h-full rounded-full" style={{ width: `${attribPct}%`, background: CHANNEL_COLORS[0] }} />
 </div>
 </Card>
 )}

 {channels.length > 0 && (
 <div>
 <p className="mb-3 text-[13px] font-medium text-stone-700">Conversion by channel</p>
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
 {channels.map((r, i) => (
 <Card key={r.channel} className="p-4">
 <div className="flex items-center gap-2">
 <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }} />
 <span className="text-[13px] font-medium text-stone-800">{r.channel}</span>
 </div>
 <p className="mt-3 text-xl font-semibold tracking-tight text-stone-900">{dollars(r.sales)}</p>
 <p className="text-[12px] text-stone-400">order value</p>
 <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-[12px]">
 <span className="text-stone-500">{r.clicks.toLocaleString()} <span className="text-stone-400">clicks</span></span>
 <span className="font-medium tabular-nums text-stone-700">{r.convPct}%<span className="ml-1 font-normal text-stone-400">conv</span></span>
 </div>
 </Card>
 ))}
 </div>
 <p className="mt-3 text-[11px] text-stone-400">Add <span className="font-mono">?utm_source=</span> to the links you share to populate channel conversion.</p>
 </div>
 )}
 </div>
 ) : (
 <EmptyState icon={<BarChart3 size={28} strokeWidth={1.5} />} title="No traffic yet for this period" body="As shoppers find your storefront — from Google, Instagram, a link in your bio, or a direct visit — you’ll see exactly where they came from here." />
 )
 )}

 {/* ── DEMAND ── */}
 {tab === "demand" && (
 <div className="space-y-6">
 {(data.productViews > 0 || data.favorites > 0 || data.orders > 0) && (
 <Card className="p-5">
 <CardTitle>Demand funnel</CardTitle>
 <Funnel steps={[{ label: "Product views", value: data.productViews }, { label: "Favorites", value: data.favorites }, { label: "Orders", value: data.orders }]} />
 </Card>
 )}
 <div className="grid gap-4 sm:grid-cols-2">
 <Card className="p-5">
 <CardTitle>Most viewed</CardTitle>
 {data.topViewed.length === 0 ? <p className="py-4 text-center text-[12px] text-stone-400">No views yet.</p> : (
 <div className="space-y-2">
 {data.topViewed.map((it) => (
 <div key={it.itemId} className="flex items-center justify-between text-[13px]">
 <span className="max-w-[200px] truncate text-stone-700">{it.title}</span>
 <span className="shrink-0 tabular-nums text-stone-500">{it.count} view{it.count === 1 ? "" : "s"}</span>
 </div>
 ))}
 </div>
 )}
 </Card>
 <Card className="p-5">
 <CardTitle>Most favorited</CardTitle>
 {data.topFavorited.length === 0 ? <p className="py-4 text-center text-[12px] text-stone-400">No favorites yet.</p> : (
 <div className="space-y-2">
 {data.topFavorited.map((it) => (
 <div key={it.itemId} className="flex items-center justify-between text-[13px]">
 <span className="max-w-[200px] truncate text-stone-700">{it.title}</span>
 <span className="shrink-0 tabular-nums text-[#e0245e]">♥ {it.count}</span>
 </div>
 ))}
 </div>
 )}
 </Card>
 </div>
 <Card className="p-5">
 <CardTitle>Top searches</CardTitle>
 {data.topSearches.length === 0 ? (
 <p className="py-2 text-[12px] text-stone-400">No searches yet — this fills in as shoppers search your storefront.</p>
 ) : (
 <div className="flex flex-wrap gap-2">
 {data.topSearches.map((s) => (
 <span key={s.query} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[12px] text-stone-700">
 {s.query} <span className="tabular-nums text-stone-400">{s.count}</span>
 </span>
 ))}
 </div>
 )}
 </Card>
 </div>
 )}
 </>
 ) : null}
 </div>
 );
}
