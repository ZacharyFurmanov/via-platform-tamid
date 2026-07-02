"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, PageHeader, cn } from "@/app/store/ui";

type ChannelRow = { channel: string; clicks: number; orders: number; sales: number; convPct: number; aov: number };
type Trend = { days: string[]; series: { channel: string; counts: number[] }[] };
type Attribution = { rows: ChannelRow[]; totals: { clicks: number; orders: number; sales: number; convPct: number; aov: number }; newCustomers: number; returningCustomers: number; trend?: Trend };

const TREND_COLORS = ["#5D0F17", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6"];
function TrendChart({ days, series }: Trend) {
 if (!series.length || !days.length || series.every((s) => s.counts.every((c) => c === 0))) return null;
 const max = Math.max(1, ...series.flatMap((s) => s.counts));
 const W = 100, H = 36;
 const xAt = (i: number) => (days.length > 1 ? (i / (days.length - 1)) * W : 0);
 const yAt = (v: number) => H - (v / max) * H;
 return (
 <div className="mb-5">
 <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-28 w-full">
 {series.map((s, si) => (
 <polyline key={s.channel} fill="none" stroke={TREND_COLORS[si % TREND_COLORS.length]} strokeWidth="1" vectorEffect="non-scaling-stroke" strokeLinejoin="round" points={s.counts.map((c, i) => `${xAt(i)},${yAt(c)}`).join(" ")} />
 ))}
 </svg>
 <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
 {series.map((s, si) => (
 <span key={s.channel} className="flex items-center gap-1.5 text-[11px] text-stone-500"><i className="h-2 w-2 rounded-full" style={{ background: TREND_COLORS[si % TREND_COLORS.length] }} />{s.channel}</span>
 ))}
 </div>
 <div className="mt-0.5 flex justify-between text-[10px] text-stone-400"><span>{days[0]}</span><span>{days[days.length - 1]}</span></div>
 </div>
 );
}

export default function AudiencePage() {
 const [range, setRange] = useState<"30" | "all">("30");
 const [aud, setAud] = useState<Attribution | null>(null);

 const load = useCallback(async () => {
 try { const r = await fetch(`/api/store/audience?days=${range}`); if (r.ok) setAud(await r.json()); } catch { /* ignore */ }
 }, [range]);
 useEffect(() => { (async () => { await load(); })(); }, [load]);

 return (
 <div className="mx-auto max-w-2xl px-6 py-10 sm:px-8">
 <PageHeader title="Audience" subtitle="Where your shoppers come from — attribution by channel." />
 <Card>
 <CardHeader
 title="By channel"
 subtitle="Clicks, orders, revenue"
 action={
 <div className="flex gap-1">
 {(["30", "all"] as const).map((r) => (
 <button key={r} onClick={() => setRange(r)} className={cn("rounded px-2 py-0.5 text-[11px] font-medium transition", range === r ? "bg-stone-100 text-stone-900" : "text-stone-400 hover:text-stone-700")}>{r === "30" ? "30d" : "All"}</button>
 ))}
 </div>
 }
 />
 <div className="px-5 py-4">
 {!aud || aud.totals.clicks === 0 ? (
 <p className="py-6 text-center text-[13px] text-stone-400">No traffic data yet for this period. Once shoppers click through from your channels, you’ll see the breakdown here.</p>
 ) : (
 <>
 {aud.trend && <TrendChart {...aud.trend} />}
 <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1.5 text-[13px] text-stone-600">
 <span><b className="text-stone-900 tabular-nums">{aud.totals.clicks.toLocaleString()}</b> clicks</span>
 <span><b className="text-stone-900 tabular-nums">{aud.totals.orders.toLocaleString()}</b> orders</span>
 <span><b className="text-stone-900 tabular-nums">${aud.totals.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b> sales</span>
 <span><b className="text-stone-900 tabular-nums">{aud.totals.convPct}%</b> conv</span>
 <span><b className="text-stone-900 tabular-nums">{aud.newCustomers}</b> new · <b className="text-stone-900 tabular-nums">{aud.returningCustomers}</b> returning</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-[13px]">
 <thead>
 <tr className="border-b border-stone-100 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-stone-400">
 <th className="py-2 pr-3 font-medium">Channel</th>
 <th className="px-3 py-2 text-right font-medium">Clicks</th>
 <th className="px-3 py-2 text-right font-medium">Orders</th>
 <th className="px-3 py-2 text-right font-medium">Sales</th>
 <th className="px-3 py-2 text-right font-medium">Conv</th>
 <th className="py-2 pl-3 text-right font-medium">AOV</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-stone-100">
 {aud.rows.map((r) => (
 <tr key={r.channel}>
 <td className="py-2.5 pr-3 font-medium text-stone-800">{r.channel}</td>
 <td className="px-3 py-2.5 text-right tabular-nums text-stone-600">{r.clicks.toLocaleString()}</td>
 <td className="px-3 py-2.5 text-right tabular-nums text-stone-600">{r.orders.toLocaleString()}</td>
 <td className="px-3 py-2.5 text-right tabular-nums text-stone-900">${r.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
 <td className="px-3 py-2.5 text-right tabular-nums text-stone-600">{r.convPct}%</td>
 <td className="py-2.5 pl-3 text-right tabular-nums text-stone-600">${r.aov.toLocaleString()}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <p className="pt-3 text-[11px] text-stone-400">VYA-attributed click-throughs + orders {range === "30" ? "in the last 30 days" : "all time"}.</p>
 </>
 )}
 </div>
 </Card>
 </div>
 );
}
