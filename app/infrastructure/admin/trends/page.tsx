"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { Card, PageHeader } from "@/app/store/ui";

type Heat = { brand: string; rank: number; momentumPct: number | null; isBreakout: boolean; heat: number };
type Cat = { key: string; rank: number; momentumPct: number | null; isBreakout: boolean };
type YourBrand = { brand: string; rank: number; momentumPct: number | null; trending: boolean; note: string };
type Data = { rising: Heat[]; categories: Cat[]; yourBrands: YourBrand[]; generatedAt: string };

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
 <PageHeader title="Trends" subtitle="What’s heating up across VYA right now — to guide what you source and how you price. Aggregated across the marketplace; no individual store’s numbers." />

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
 {data.rising.map((b) => (
 <div key={b.brand} className="flex items-center justify-between text-[13px]">
 <span className="flex items-center gap-2"><span className="w-5 tabular-nums text-stone-300">{b.rank}</span><span className="text-stone-800">{b.brand}</span></span>
 <Momentum pct={b.momentumPct} breakout={b.isBreakout} />
 </div>
 ))}
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

 <p className="text-[11px] text-stone-400">Demand momentum = weighted views, favorites, searches, and sales vs. the prior 30 days. A signal to source toward, not a guarantee.</p>
 </div>
 )}
 </div>
 );
}
