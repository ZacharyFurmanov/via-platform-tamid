"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Card, PageHeader, EmptyState } from "@/app/store/ui";

type ChannelRow = { channel: string; clicks: number; orders: number; sales: number; convPct: number; aov: number };
type Traffic = { total: number; byType: { type: string; sessions: number }[]; topSources: { source: string; type: string; sessions: number }[] };
type Perf = {
 rows: ChannelRow[];
 totals: { clicks: number; orders: number; sales: number; convPct: number; aov: number };
 attributedSales: number;
 totalSales: number;
 traffic: Traffic;
};

// Each traffic type gets a fixed color so the bar, legend, and source dots agree.
const TYPE_COLOR: Record<string, string> = {
 Direct: "#9AA0A6", Search: "#5D0F17", Social: "#A33A44", Email: "#C2A14D", Referral: "#3F6F6F", Paid: "#8C6BA8",
};
const typeColor = (t: string) => TYPE_COLOR[t] || "#9AA0A6";
const CHANNEL_COLORS = ["#5D0F17", "#A33A44", "#C9777E", "#3F6F6F", "#7BA7A7", "#C2A14D", "#8C6BA8", "#9AA0A6"];
const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

export default function PerformancePage() {
 const [range, setRange] = useState<"30" | "all">("30");
 const [data, setData] = useState<Perf | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 let active = true;
 (async () => {
 setLoading(true);
 try {
 const r = await fetch(`/api/store/performance?days=${range}`);
 if (r.ok && active) setData(await r.json());
 } catch {
 /* keep prior */
 }
 if (active) setLoading(false);
 })();
 return () => { active = false; };
 }, [range]);

 const traffic = data?.traffic || { total: 0, byType: [], topSources: [] };
 const rows = (data?.rows || []).slice().sort((a, b) => b.clicks - a.clicks);
 const totalClicks = data?.totals.clicks || 0;
 const attributed = data?.attributedSales || 0;
 const totalSales = data?.totalSales || 0;
 const attribPct = pct(attributed, totalSales);
 const color = (i: number) => CHANNEL_COLORS[i % CHANNEL_COLORS.length];

 const hasAnything = traffic.total > 0 || totalClicks > 0 || totalSales > 0;

 return (
 <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
 <PageHeader
 title="Performance"
 subtitle="Where your visitors come from, and what they’re worth — across every channel that sends you traffic."
 actions={
 <div className="inline-flex rounded-lg border border-stone-200 p-0.5 text-[12px]">
 {(["30", "all"] as const).map((r) => (
 <button
 key={r}
 onClick={() => setRange(r)}
 className={`rounded-md px-3 py-1 transition ${range === r ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-800"}`}
 >
 {r === "30" ? "Last 30 days" : "All time"}
 </button>
 ))}
 </div>
 }
 />

 {loading && !data ? (
 <div className="flex items-center justify-center py-32 text-sm text-stone-400">Loading…</div>
 ) : !hasAnything ? (
 <EmptyState
 icon={<BarChart3 size={28} strokeWidth={1.5} />}
 title="No traffic yet for this period"
 body="As shoppers find your storefront — from Google, Instagram, TikTok, a link in your bio, or a direct visit — you’ll see exactly where they came from here."
 />
 ) : (
 <div className="space-y-6">
 {/* Where your visitors come from — real referrer-based sources */}
 {traffic.total > 0 && (
 <Card className="p-6">
 <div className="mb-3 flex items-baseline justify-between">
 <p className="text-[13px] font-medium text-stone-500">Where your visitors come from</p>
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

 {/* Top specific sources (Google, Instagram, a referring site…) */}
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
 </Card>
 )}

 {/* Sales attributed to marketing */}
 {totalSales > 0 && (
 <Card className="p-6">
 <div className="flex items-baseline justify-between">
 <div>
 <p className="text-[13px] font-medium text-stone-500">Sales attributed to marketing</p>
 <p className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">{money(attributed)} <span className="text-base font-normal text-stone-400">of {money(totalSales)} total store sales</span></p>
 </div>
 <span className="text-2xl font-semibold tabular-nums text-stone-900">{attribPct}%</span>
 </div>
 <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
 <div className="h-full rounded-full" style={{ width: `${attribPct}%`, background: CHANNEL_COLORS[0] }} />
 </div>
 </Card>
 )}

 {/* Conversion by channel — from tagged click-throughs that led to orders */}
 {totalClicks > 0 && (
 <div>
 <p className="mb-3 text-[13px] font-medium text-stone-500">Conversion by channel</p>
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
 {rows.map((r, i) => (
 <Card key={r.channel} className="p-4">
 <div className="flex items-center gap-2">
 <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color(i) }} />
 <span className="text-[13px] font-medium text-stone-800">{r.channel}</span>
 </div>
 <p className="mt-3 text-xl font-semibold tracking-tight text-stone-900">{money(r.sales)}</p>
 <p className="text-[12px] text-stone-400">order value</p>
 <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-[12px]">
 <span className="text-stone-500">{r.clicks.toLocaleString()} <span className="text-stone-400">clicks</span></span>
 <span className="font-medium tabular-nums text-stone-700">{r.convPct}%<span className="ml-1 font-normal text-stone-400">conv</span></span>
 </div>
 </Card>
 ))}
 </div>
 <p className="mt-3 text-[11px] text-stone-400">Conversion + order value come from UTM-tagged click-throughs attributed back to the order they drove. Add <span className="font-mono">?utm_source=</span> to the links you share to populate this.</p>
 </div>
 )}
 </div>
 )}
 </div>
 );
}
