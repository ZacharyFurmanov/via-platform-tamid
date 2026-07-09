"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { Card, PageHeader } from "@/app/store/ui";

type Heat = { brand: string; rank: number; momentumPct: number | null; isBreakout: boolean; heat: number };
type Cat = { key: string; rank: number; momentumPct: number | null; isBreakout: boolean };
type YourBrand = { brand: string; rank: number; momentumPct: number | null; trending: boolean; note: string };
type GTrend = { brand: string; momentumPct: number | null; avgInterest: number; breakout: boolean };
type Resale = { brand: string; soldCount: number; medianPriceCents: number | null; webMedianCents: number | null; volMomentumPct: number | null; priceMomentumPct: number | null };
type IgBuzz = { brand: string; buzzScore: number; sampleCount: number; momentumPct: number | null };
type Play = { brand: string; action: "source" | "price" | "watch" | "cool"; reason: string; suggestedPriceCents: number | null; carried: boolean };
type Data = { rising: Heat[]; categories: Cat[]; yourBrands: YourBrand[]; googleTrends: GTrend[]; resaleMarket: Resale[]; igBuzz: IgBuzz[]; playbook: Play[]; webConfigured: boolean; socialConfigured: boolean; generatedAt: string };

const PLAY_STYLE: Record<Play["action"], { label: string; chip: string; rail: string }> = {
 source: { label: "Source", chip: "bg-emerald-100 text-emerald-700", rail: "bg-emerald-400" },
 price: { label: "Price", chip: "bg-sky-100 text-sky-700", rail: "bg-sky-400" },
 watch: { label: "Watch", chip: "bg-amber-100 text-amber-700", rail: "bg-amber-400" },
 cool: { label: "Ease off", chip: "bg-stone-100 text-stone-500", rail: "bg-stone-300" },
};

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
 <PageHeader title="Trends" subtitle="Your sourcing & pricing playbook — VYA demand, Google Search, and real eBay resale prices read together into clear calls. The signals behind each call are below." />

 {loading ? (
 <div className="py-24 text-center text-sm text-stone-400">Loading…</div>
 ) : !data ? (
 <div className="py-24 text-center text-sm text-stone-400">Couldn’t load trends.</div>
 ) : (
 <div className="space-y-6">
 {/* The playbook — every signal read together into a call. The actionable layer. */}
 {data.playbook && data.playbook.length > 0 && (
 <Card className="p-5">
 <p className="mb-1 text-[13px] font-medium text-stone-700">What to do this week</p>
 <p className="mb-3 text-[12px] text-stone-400">VYA demand, Google search, and eBay resale — read together into one call per brand.</p>
 <div className="space-y-2">
 {data.playbook.map((p) => {
 const s = PLAY_STYLE[p.action];
 return (
 <div key={p.brand} className="flex gap-3 overflow-hidden rounded-lg border border-stone-100">
 <span className={`w-1 shrink-0 ${s.rail}`} />
 <div className="min-w-0 flex-1 py-2.5 pr-3">
 <div className="flex items-center justify-between gap-2">
 <span className="flex items-center gap-2">
 <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${s.chip}`}>{s.label}</span>
 <span className="text-[13px] font-semibold text-stone-900">{p.brand}</span>
 {p.carried && <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">you carry</span>}
 </span>
 {p.suggestedPriceCents ? <span className="shrink-0 text-[12px] font-medium tabular-nums text-stone-700">list ~${Math.round(p.suggestedPriceCents / 100).toLocaleString()}</span> : null}
 </div>
 <p className="mt-1 text-[12px] leading-relaxed text-stone-500">{p.reason}</p>
 </div>
 </div>
 );
 })}
 </div>
 </Card>
 )}

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
 <p className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-stone-700"><span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-100 font-mono text-[9px] font-bold text-emerald-700">$</span> Resale market — eBay sold + web asking</p>
 <p className="mb-3 text-[12px] text-stone-400"><span className="font-medium">sold</span> = real eBay completed-sale median · <span className="font-medium">web</span> = median asking across resale sites (Google Shopping: Vestiaire, Grailed, RealReal…). Momentum = vs. a week ago.</p>
 <div className="divide-y divide-stone-100">
 {[...data.resaleMarket].sort((a, b) => b.soldCount - a.soldCount).slice(0, 12).map((r) => (
 <div key={r.brand} className="flex items-center justify-between py-2 text-[13px]">
 <span className="min-w-0 truncate text-stone-800">{r.brand}</span>
 <div className="flex items-center gap-3">
 <span className="text-[11px] tabular-nums text-stone-400">{r.soldCount.toLocaleString()} sold{r.medianPriceCents ? ` · sold ~$${Math.round(r.medianPriceCents / 100).toLocaleString()}` : ""}{r.webMedianCents ? ` · web ~$${Math.round(r.webMedianCents / 100).toLocaleString()}` : ""}</span>
 {r.volMomentumPct !== null ? <Momentum pct={r.volMomentumPct} /> : <span className="text-[11px] text-stone-300">building…</span>}
 </div>
 </div>
 ))}
 </div>
 </Card>
 )}

 {/* Social buzz — Instagram (a leading cultural signal) */}
 {data.socialConfigured && data.igBuzz && data.igBuzz.length > 0 && (
 <Card className="p-5">
 <p className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-stone-700"><span className="grid h-4 w-4 place-items-center rounded-full bg-fuchsia-100 font-mono text-[9px] font-bold text-fuchsia-700">IG</span> Social buzz — Instagram</p>
 <p className="mb-3 text-[12px] text-stone-400">Engagement on each brand&rsquo;s top hashtag posts — a <span className="font-medium">leading</span> signal (social heat runs ahead of resale). Momentum = vs. a week ago.</p>
 <div className="divide-y divide-stone-100">
 {[...data.igBuzz].sort((a, b) => (b.momentumPct ?? -999) - (a.momentumPct ?? -999) || b.buzzScore - a.buzzScore).slice(0, 12).map((b) => (
 <div key={b.brand} className="flex items-center justify-between py-2 text-[13px]">
 <span className="min-w-0 truncate text-stone-800">{b.brand}</span>
 <div className="flex items-center gap-3">
 <span className="hidden text-[11px] tabular-nums text-stone-400 sm:inline">{b.buzzScore.toLocaleString()} engagements</span>
 {b.momentumPct !== null ? <Momentum pct={b.momentumPct} /> : <span className="text-[11px] text-stone-300">building…</span>}
 </div>
 </div>
 ))}
 </div>
 </Card>
 )}

 {!data.webConfigured && !data.socialConfigured && (
 <Card className="p-5">
 <p className="text-[13px] font-medium text-stone-700">Add web signals — Google Search &amp; resale sites</p>
 <p className="mt-1 text-[12px] text-stone-500">Blend real Google Search momentum (and resale-market comps) into these trends. Turn on SerpApi (<span className="font-mono text-[11px]">SERPAPI_ENABLED=true</span>) to activate — it stays dormant, with no calls or spend, until then.</p>
 </Card>
 )}

 <p className="text-[11px] text-stone-400">VYA momentum = weighted views, favorites, searches, and sales vs. the prior 30 days. <span className="font-mono">G</span> = Google Search interest · eBay = real sold volume/price · web = resale-site asking · IG = Instagram buzz (leading). Signals to source toward, not guarantees.</p>
 </div>
 )}
 </div>
 );
}
