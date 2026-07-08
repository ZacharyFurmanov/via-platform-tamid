"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { Card, PageHeader } from "@/app/store/ui";

type Heat = { brand: string; rank: number; momentumPct: number | null; isBreakout: boolean; heat: number };
type Cat = { key: string; rank: number; momentumPct: number | null; isBreakout: boolean };
type YourBrand = { brand: string; rank: number; momentumPct: number | null; trending: boolean; note: string };
type GTrend = { brand: string; momentumPct: number | null; avgInterest: number; breakout: boolean };
type Resale = { brand: string; soldCount: number; medianPriceCents: number | null; volMomentumPct: number | null; priceMomentumPct: number | null };
type Data = { rising: Heat[]; categories: Cat[]; yourBrands: YourBrand[]; googleTrends: GTrend[]; resaleMarket: Resale[]; webConfigured: boolean; generatedAt: string };

// A compact "Google Search" momentum chip, shown alongside VYA demand.
function GChip({ pct, breakout }: { pct: number | null; breakout?: boolean }) {
 if (pct === null) return null;
 const up = pct >= 0;
 return (
 <span title="Google Search momentum (3-mo)" className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums ${breakout ? "bg-amber-100 text-amber-700" : up ? "bg-sky-50 text-sky-700" : "bg-stone-100 text-stone-400"}`}>
 <span className="font-mono text-[9px] font-bold">G</span>{up ? "+" : ""}{Math.round(pct)}%
 </span>
 );
}

function Momentum({ pct, breakout }: { pct: number | null; breakout?: boolean }) {
 if (breakout) return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700"><Sparkles size={11} /> Breakout</span>;
 if (pct === null) return <span className="text-[12px] text-stone-400">—</span>;
 const up = pct >= 0;
 return (
 <span className={`inline-flex items-center gap-0.5 text-[12px] font-medium tabular-nums ${up ? "text-emerald-600" : "text-stone-400"}`}>
 {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{up ? "+" : ""}{Math.round(pct)}%
 </span>
 );
}

export default function TrendsPage() {
 const [data, setData] = useState<Data | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetch("/api/store/trends").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setData(d); setLoading(false); }).catch(() => setLoading(false));
 }, []);

 return (
 <div className="mx-auto max-w-4xl px-6 py-8">
 <PageHeader title="Trends" subtitle="What’s heating up across VYA and the wider resale market — VYA demand blended with real Google Search interest — to guide what you source and how you price." />

 {loading ? (
 <div className="py-24 text-center text-sm text-stone-400">Loading…</div>
 ) : !data ? (
 <div className="py-24 text-center text-sm text-stone-400">Couldn’t load trends.</div>
 ) : (
 <div className="space-y-6">
 {/* your brands — the actionable part */}
 {data.yourBrands.length > 0 && (
 <Card className="p-5">
 <p className="mb-1 text-[13px] font-medium text-stone-700">Your brands on VYA</p>
 <p className="mb-3 text-[12px] text-stone-400">How the brands you carry are trending in marketplace demand.</p>
 <div className="divide-y divide-stone-100">
 {data.yourBrands.map((b) => (
 <div key={b.brand} className="flex items-center justify-between py-2">
 <div className="min-w-0">
 <span className="text-[13px] font-medium text-stone-800">{b.brand}</span>
 <span className="ml-2 text-[11px] text-stone-400">#{b.rank} in demand</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="hidden max-w-[220px] truncate text-[11px] text-stone-400 sm:inline">{b.note}</span>
 <Momentum pct={b.momentumPct} />
 </div>
 </div>
 ))}
 </div>
 </Card>
 )}

 <div className="grid gap-4 sm:grid-cols-2">
 {/* rising brands */}
 <Card className="p-5">
 <p className="mb-3 text-[13px] font-medium text-stone-700">Rising brands</p>
 {data.rising.length === 0 ? <p className="py-4 text-center text-[12px] text-stone-400">Not enough marketplace signal yet.</p> : (
 <div className="space-y-1.5">
 {data.rising.map((b) => {
 const g = data.googleTrends?.find((x) => x.brand.toLowerCase() === b.brand.toLowerCase());
 return (
 <div key={b.brand} className="flex items-center justify-between text-[13px]">
 <span className="flex items-center gap-2"><span className="w-5 tabular-nums text-stone-300">{b.rank}</span><span className="text-stone-800">{b.brand}</span></span>
 <span className="flex items-center gap-2">
 {g && <GChip pct={g.momentumPct} breakout={g.breakout} />}
 <Momentum pct={b.momentumPct} breakout={b.isBreakout} />
 </span>
 </div>
 );
 })}
 </div>
 )}
 </Card>

 {/* categories */}
 <Card className="p-5">
 <p className="mb-3 text-[13px] font-medium text-stone-700">Categories heating up</p>
 {data.categories.length === 0 ? <p className="py-4 text-center text-[12px] text-stone-400">Not enough marketplace signal yet.</p> : (
 <div className="space-y-1.5">
 {data.categories.map((c) => (
 <div key={c.key} className="flex items-center justify-between text-[13px]">
 <span className="flex items-center gap-2"><span className="w-5 tabular-nums text-stone-300">{c.rank}</span><span className="capitalize text-stone-800">{c.key}</span></span>
 <Momentum pct={c.momentumPct} breakout={c.isBreakout} />
 </div>
 ))}
 </div>
 )}
 </Card>
 </div>

 {/* Across the web — real Google Search interest */}
 {data.webConfigured ? (
 data.googleTrends.length > 0 && (
 <Card className="p-5">
 <p className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-stone-700"><span className="grid h-4 w-4 place-items-center rounded-full bg-sky-100 font-mono text-[9px] font-bold text-sky-700">G</span> Across the web — Google Search</p>
 <p className="mb-3 text-[12px] text-stone-400">Real search interest &amp; 3-month momentum for these brands (Google Trends) — demand beyond VYA.</p>
 <div className="divide-y divide-stone-100">
 {[...data.googleTrends].sort((a, b) => (b.breakout ? 1 : 0) - (a.breakout ? 1 : 0) || (b.momentumPct ?? -999) - (a.momentumPct ?? -999)).slice(0, 12).map((g) => (
 <div key={g.brand} className="flex items-center justify-between py-2 text-[13px]">
 <span className="text-stone-800">{g.brand}</span>
 <div className="flex items-center gap-3">
 <span className="hidden text-[11px] tabular-nums text-stone-400 sm:inline">interest {g.avgInterest}/100</span>
 <Momentum pct={g.momentumPct} breakout={g.breakout} />
 </div>
 </div>
 ))}
 </div>
 </Card>
 )
 ) : null}

 {/* Resale market — real eBay SOLD listings */}
 {data.webConfigured && data.resaleMarket.length > 0 && (
 <Card className="p-5">
 <p className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-stone-700"><span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-100 font-mono text-[9px] font-bold text-emerald-700">$</span> Resale market — eBay sold</p>
 <p className="mb-3 text-[12px] text-stone-400">Real sold volume &amp; median resale price per brand (eBay completed sales). Momentum = vs. a week ago.</p>
 <div className="divide-y divide-stone-100">
 {[...data.resaleMarket].sort((a, b) => b.soldCount - a.soldCount).slice(0, 12).map((r) => (
 <div key={r.brand} className="flex items-center justify-between py-2 text-[13px]">
 <span className="min-w-0 truncate text-stone-800">{r.brand}</span>
 <div className="flex items-center gap-3">
 <span className="text-[11px] tabular-nums text-stone-400">{r.soldCount} sold{r.medianPriceCents ? ` · ~$${Math.round(r.medianPriceCents / 100).toLocaleString()}` : ""}</span>
 {r.volMomentumPct !== null ? <Momentum pct={r.volMomentumPct} /> : <span className="text-[11px] text-stone-300">building…</span>}
 </div>
 </div>
 ))}
 </div>
 </Card>
 )}

 {!data.webConfigured && (
 <Card className="p-5">
 <p className="text-[13px] font-medium text-stone-700">Add web signals — Google Search &amp; resale sites</p>
 <p className="mt-1 text-[12px] text-stone-500">Blend real Google Search momentum (and resale-market comps) into these trends. Turn on SerpApi (<span className="font-mono text-[11px]">SERPAPI_ENABLED=true</span>) to activate — it stays dormant, with no calls or spend, until then.</p>
 </Card>
 )}

 <p className="text-[11px] text-stone-400">VYA momentum = weighted views, favorites, searches, and sales vs. the prior 30 days. <span className="font-mono">G</span> = Google Search interest momentum. Signals to source toward, not guarantees.</p>
 </div>
 )}
 </div>
 );
}
