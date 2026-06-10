"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import {
 LayoutDashboard,
 BarChart3,
 Heart,
 LogOut,
 ShoppingBag,
 Search,
 MessageSquareText,
} from "lucide-react";

type StoreInfo = {
 storeSlug: string;
 storeName: string;
 location: string;
 currency: string;
 website: string;
 logo: string;
 logoBg: string;
 commissionType: "shopify-collabs" | "squarespace-manual" | "square-manual" | "custom-webhook";
 commissionRates?: { upTo?: number; rate: number }[];
 totalInventoryValue: number;
 viaCommissionPotential: number;
 storeFollowers: number;
 topFavoritedProducts: { title: string; price: number; favoriteCount: number }[];
 pendingOnboarding?: boolean;
};

type Analytics = {
 totalClicks: number;
 totalViews?: number;
 totalConversions: number;
 totalRevenue: number;
 topProducts: { name: string; count: number }[];
 topSearches?: { query: string; count: number }[];
 range: string;
};

type RangeOption = "7d" | "30d" | "all";
type Tab = "overview" | "performance" | "audience";

const DEFAULT_RATES: { upTo?: number; rate: number }[] = [
 { upTo: 1000, rate: 0.07 },
 { upTo: 5000, rate: 0.05 },
 { rate: 0.03 },
];

function calcViaCommission(revenue: number, rates?: { upTo?: number; rate: number }[]): number {
 if (revenue <= 0) return 0;
 const tiers = rates ?? DEFAULT_RATES;
 for (const tier of tiers) {
 if (tier.upTo === undefined || revenue < tier.upTo) return revenue * tier.rate;
 }
 return revenue * tiers[tiers.length - 1].rate;
}

function commissionTiersLabel(rates?: { upTo?: number; rate: number }[]): string {
 return (rates ?? DEFAULT_RATES)
 .map((t, i, arr) => {
 const pct = `${Math.round(t.rate * 100)}%`;
 if (i === 0 && t.upTo) return `${pct} under $${(t.upTo / 1000).toFixed(0)}k`;
 if (t.upTo) return `${pct} $${(arr[i - 1]?.upTo ?? 0) / 1000}k–$${t.upTo / 1000}k`;
 return `${pct} above`;
 })
 .join(" · ");
}

const NAV: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
 { id: "overview", label: "Overview", icon: LayoutDashboard },
 { id: "performance", label: "Performance", icon: BarChart3 },
 { id: "audience", label: "Audience", icon: Heart },
];

const TAB_META: Record<Tab, { title: string; subtitle: string }> = {
 overview: { title: "Overview", subtitle: "A snapshot of your store on VYA." },
 performance: { title: "Performance", subtitle: "How shoppers are engaging with your pieces." },
 audience: { title: "Audience", subtitle: "The community following and saving your work." },
};

const FEEDBACK_URL = "https://form.typeform.com/to/L13186Wp";

// ── Small presentational pieces ─────────────────────────────────────────────

function VerifiedMark() {
 return (
 <Link href="/trust" className="group/badge mt-0.5 inline-flex items-center gap-1">
 <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#5D0F17]">
 <svg viewBox="0 0 10 10" className="h-2 w-2" fill="none" stroke="#FFFDF8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
 <polyline points="2,5.2 4.2,7.5 8,3" />
 </svg>
 </span>
 <span className="text-[10px] uppercase tracking-[0.14em] text-[#5D0F17]/45 transition-colors group-hover/badge:text-[#5D0F17]">
 Verified Seller
 </span>
 </Link>
 );
}

function StoreAvatar({ store, size = 40 }: { store: StoreInfo; size?: number }) {
 return (
 <div
 className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#5D0F17]/10"
 style={{ width: size, height: size, background: store.logoBg || "#FFFDF8" }}
 >
 {store.logo ? (
 <Image src={store.logo} alt={store.storeName} width={size} height={size} className="object-contain" style={{ width: size, height: size }} />
 ) : (
 <span className="font-serif text-[#5D0F17]">{store.storeName.charAt(0)}</span>
 )}
 </div>
 );
}

function StatCard({ value, label, hint }: { value: React.ReactNode; label: string; hint?: string }) {
 return (
 <div className="rounded-2xl border border-[#5D0F17]/10 bg-white p-6">
 <p className="font-serif text-[28px] leading-none text-[#5D0F17]">{value}</p>
 <p className="mt-2.5 text-[11px] uppercase tracking-[0.12em] text-[#5D0F17]/50">{label}</p>
 {hint && <p className="mt-1 text-[11px] leading-snug text-[#5D0F17]/40">{hint}</p>}
 </div>
 );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
 return (
 <div className="overflow-hidden rounded-2xl border border-[#5D0F17]/10 bg-white">
 <div className="border-b border-[#5D0F17]/[0.07] px-6 py-4">
 <h3 className="font-serif text-lg text-[#5D0F17]">{title}</h3>
 </div>
 {children}
 </div>
 );
}

function RangeToggle({ range, onChange }: { range: RangeOption; onChange: (r: RangeOption) => void }) {
 return (
 <div className="flex gap-1 rounded-full border border-[#5D0F17]/10 bg-white p-1">
 {(["7d", "30d", "all"] as RangeOption[]).map((r) => (
 <button
 key={r}
 onClick={() => onChange(r)}
 className={`rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-[0.08em] transition-colors ${
 range === r ? "bg-[#5D0F17] text-[#FFFDF8]" : "text-[#5D0F17]/55 hover:text-[#5D0F17]"
 }`}
 >
 {r === "all" ? "All time" : r}
 </button>
 ))}
 </div>
 );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function StoreDashboardPage() {
 const router = useRouter();
 const [store, setStore] = useState<StoreInfo | null>(null);
 const [analytics, setAnalytics] = useState<Analytics | null>(null);
 const [range, setRange] = useState<RangeOption>("30d");
 const [loadingInitial, setLoadingInitial] = useState(true);
 const [tab, setTab] = useState<Tab>("overview");

 const fetchAnalytics = useCallback(async (r: RangeOption) => {
 const res = await fetch(`/api/store/analytics?range=${r}`);
 if (res.ok) setAnalytics(await res.json());
 }, []);

 useEffect(() => {
 async function init() {
 const [meRes, analyticsRes] = await Promise.all([
 fetch("/api/store/me"),
 fetch(`/api/store/analytics?range=${range}`),
 ]);
 if (!meRes.ok) {
 router.replace("/store/login");
 return;
 }
 const [storeData, analyticsData] = await Promise.all([
 meRes.json(),
 analyticsRes.ok ? analyticsRes.json() : null,
 ]);
 setStore({ storeFollowers: 0, topFavoritedProducts: [], ...storeData });
 setAnalytics(analyticsData);
 setLoadingInitial(false);
 }
 init();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 async function handleRangeChange(newRange: RangeOption) {
 setRange(newRange);
 await fetchAnalytics(newRange);
 }

 if (loadingInitial) {
 return (
 <div className="flex min-h-screen items-center justify-center bg-[#FBF8F1]">
 <p className="text-sm text-[#5D0F17]/50">Loading…</p>
 </div>
 );
 }
 if (!store) return null;

 const totalLikes = store.topFavoritedProducts.reduce((sum, p) => sum + p.favoriteCount, 0);
 const mostLiked = store.topFavoritedProducts[0];

 // ── Sidebar ──
 const sidebar = (
 <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-[#5D0F17]/10 bg-[#FFFDF8] px-3 py-6 md:flex">
 <div className="px-3 pb-6">
 <p className="font-logo text-2xl leading-none tracking-wide text-[#5D0F17]">VYA</p>
 <p className="mt-1.5 text-[10px] uppercase tracking-[0.22em] text-[#5D0F17]/40">Partner Portal</p>
 </div>

 <div className="flex items-center gap-3 rounded-2xl border border-[#5D0F17]/10 bg-white px-3 py-3">
 <StoreAvatar store={store} size={38} />
 <div className="min-w-0">
 <p className="truncate font-serif text-[15px] leading-tight text-[#5D0F17]">{store.storeName}</p>
 <VerifiedMark />
 </div>
 </div>

 <nav className="mt-6 space-y-1">
 {!store.pendingOnboarding &&
 NAV.map((item) => {
 const Icon = item.icon;
 const active = tab === item.id;
 return (
 <button
 key={item.id}
 onClick={() => setTab(item.id)}
 className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
 active ? "bg-[#5D0F17]/[0.07] font-medium text-[#5D0F17]" : "text-[#5D0F17]/55 hover:bg-[#5D0F17]/[0.04] hover:text-[#5D0F17]"
 }`}
 >
 <Icon size={17} strokeWidth={1.8} />
 <span>{item.label}</span>
 </button>
 );
 })}
 </nav>

 <div className="mt-auto space-y-3 px-1 pt-6">
 <a
 href={FEEDBACK_URL}
 target="_blank"
 rel="noopener noreferrer"
 className="block rounded-xl border border-[#5D0F17]/10 bg-white p-3.5 transition-colors hover:border-[#5D0F17]/25"
 >
 <div className="flex items-center gap-2 text-[#5D0F17]">
 <MessageSquareText size={15} strokeWidth={1.8} />
 <span className="text-xs font-medium">Share feedback</span>
 </div>
 <p className="mt-1 text-[11px] leading-snug text-[#5D0F17]/45">Help us improve VYA. Always anonymous.</p>
 </a>
 <button
 onClick={() => signOut({ callbackUrl: "/store/login" })}
 className="flex items-center gap-2 px-2 text-[11px] uppercase tracking-[0.1em] text-[#5D0F17]/50 transition-colors hover:text-[#5D0F17]"
 >
 <LogOut size={14} strokeWidth={1.8} /> Sign out
 </button>
 </div>
 </aside>
 );

 // ── Mobile header (sidebar is hidden < md) ──
 const mobileHeader = (
 <div className="flex items-center justify-between border-b border-[#5D0F17]/10 px-5 py-4 md:hidden">
 <div className="flex items-center gap-2.5">
 <StoreAvatar store={store} size={32} />
 <div>
 <p className="font-serif text-sm leading-tight text-[#5D0F17]">{store.storeName}</p>
 <VerifiedMark />
 </div>
 </div>
 <button
 onClick={() => signOut({ callbackUrl: "/store/login" })}
 className="text-[11px] uppercase tracking-[0.1em] text-[#5D0F17]/50"
 >
 Sign out
 </button>
 </div>
 );

 const mobileTabs = !store.pendingOnboarding && (
 <div className="flex gap-2 overflow-x-auto border-b border-[#5D0F17]/10 px-5 py-3 md:hidden">
 {NAV.map((item) => (
 <button
 key={item.id}
 onClick={() => setTab(item.id)}
 className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs transition-colors ${
 tab === item.id ? "bg-[#5D0F17] text-[#FFFDF8]" : "border border-[#5D0F17]/15 text-[#5D0F17]/60"
 }`}
 >
 {item.label}
 </button>
 ))}
 </div>
 );

 // ── Pending onboarding — clean welcome, no sourcing ──
 if (store.pendingOnboarding) {
 return (
 <div className="min-h-screen bg-[#FBF8F1] text-[#5D0F17]">
 <div className="mx-auto flex min-h-screen max-w-[1240px]">
 {sidebar}
 <main className="min-w-0 flex-1">
 {mobileHeader}
 <div className="mx-auto max-w-2xl px-6 py-20 text-center">
 <p className="font-serif text-3xl text-[#5D0F17]">Welcome to VYA</p>
 <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[#5D0F17]/55">
 Your store is being set up. Once your catalog is live, your dashboard will fill with
 audience and performance insights — views, saves, conversions, and commission.
 </p>
 <a
 href={FEEDBACK_URL}
 target="_blank"
 rel="noopener noreferrer"
 className="mt-8 inline-block rounded-full bg-[#5D0F17] px-7 py-3 text-xs uppercase tracking-[0.1em] text-[#FFFDF8] transition-opacity hover:opacity-90"
 >
 Share feedback
 </a>
 </div>
 </main>
 </div>
 </div>
 );
 }

 const meta = TAB_META[tab];

 return (
 <div className="min-h-screen bg-[#FBF8F1] text-[#5D0F17]">
 <div className="mx-auto flex min-h-screen max-w-[1240px]">
 {sidebar}

 <main className="min-w-0 flex-1">
 {mobileHeader}
 {mobileTabs}

 {/* Top bar */}
 <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6 md:px-9 md:py-7">
 <div>
 <h1 className="font-serif text-[26px] leading-tight text-[#5D0F17] md:text-[28px]">{meta.title}</h1>
 <p className="mt-1 text-sm text-[#5D0F17]/50">{meta.subtitle}</p>
 </div>
 <div className="flex items-center gap-4">
 {tab === "performance" && <RangeToggle range={range} onChange={handleRangeChange} />}
 <div className="hidden items-center gap-2.5 lg:flex">
 <StoreAvatar store={store} size={34} />
 <span className="text-sm text-[#5D0F17]/70">{store.location}</span>
 </div>
 </div>
 </div>

 <div className="px-6 pb-16 md:px-9">
 {/* ── OVERVIEW ── */}
 {tab === "overview" && (
 <div className="space-y-8">
 <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
 <StatCard value={`$${(analytics?.totalRevenue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} label="Revenue · last 30d" />
 <StatCard value={(analytics?.totalConversions ?? 0).toLocaleString()} label="Conversions · 30d" />
 <StatCard value={store.storeFollowers.toLocaleString()} label="Store followers" />
 <StatCard value={totalLikes.toLocaleString()} label="Product likes" />
 </div>

 <section>
 <h2 className="mb-4 font-serif text-xl text-[#5D0F17]">Revenue potential</h2>
 {store.totalInventoryValue > 0 ? (
 <>
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
 <StatCard value={`$${store.totalInventoryValue.toLocaleString()}`} label="Total listed inventory" />
 <StatCard value={`$${store.viaCommissionPotential.toLocaleString()}`} label="VYA commission if sold" />
 <StatCard
 value={store.commissionType === "shopify-collabs" ? "Automatic" : "Manual"}
 label="Payout method"
 hint={
 store.commissionType === "shopify-collabs"
 ? "Via Shopify Collabs"
 : store.commissionType === "squarespace-manual"
 ? "Via Squarespace invoice"
 : "Via invoice"
 }
 />
 </div>
 <p className="mt-3 text-[11px] text-[#5D0F17]/40">Commission rates: {commissionTiersLabel(store.commissionRates)}</p>
 </>
 ) : (
 <div className="rounded-2xl border border-[#5D0F17]/10 bg-white p-8 text-center text-sm text-[#5D0F17]/50">
 Once your catalog is synced, your inventory value and commission potential will appear here.
 </div>
 )}
 </section>
 </div>
 )}

 {/* ── PERFORMANCE ── */}
 {tab === "performance" && (
 <div className="space-y-8">
 {analytics ? (
 <>
 <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
 <StatCard value={(analytics.totalViews ?? 0).toLocaleString()} label="Views on VYA" hint={`${analytics.totalClicks.toLocaleString()} clicked to store`} />
 <StatCard value={analytics.totalConversions.toLocaleString()} label="Conversions" />
 <StatCard value={`$${analytics.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} label="Revenue" />
 <StatCard
 value={`$${Math.round(calcViaCommission(analytics.totalRevenue, store.commissionRates)).toLocaleString()}`}
 label="VYA commission"
 hint={`${(store.commissionRates ?? DEFAULT_RATES).map((t) => `${Math.round(t.rate * 100)}%`).join(" · ")} tiered`}
 />
 </div>

 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
 <Panel title="Top products">
 {analytics.topProducts.length > 0 ? (
 <div className="divide-y divide-[#5D0F17]/[0.06]">
 {analytics.topProducts.map((p, i) => (
 <div key={i} className="flex items-center justify-between gap-4 px-6 py-3.5">
 <span className="flex items-center gap-3 text-sm text-[#5D0F17]">
 <ShoppingBag size={15} strokeWidth={1.7} className="text-[#5D0F17]/35" />
 <span className="truncate">{p.name}</span>
 </span>
 <span className="shrink-0 text-sm text-[#5D0F17]/50">{p.count} click{p.count !== 1 ? "s" : ""}</span>
 </div>
 ))}
 </div>
 ) : (
 <p className="px-6 py-8 text-center text-sm text-[#5D0F17]/45">No product clicks yet.</p>
 )}
 </Panel>

 <Panel title="Top searches on VYA">
 {analytics.topSearches && analytics.topSearches.length > 0 ? (
 <div className="divide-y divide-[#5D0F17]/[0.06]">
 {analytics.topSearches.map((s, i) => (
 <div key={i} className="flex items-center justify-between gap-4 px-6 py-3.5">
 <span className="flex items-center gap-3 text-sm text-[#5D0F17]">
 <Search size={15} strokeWidth={1.7} className="text-[#5D0F17]/35" />
 <span className="truncate">{s.query}</span>
 </span>
 <span className="shrink-0 text-sm text-[#5D0F17]/50">{s.count}</span>
 </div>
 ))}
 </div>
 ) : (
 <p className="px-6 py-8 text-center text-sm text-[#5D0F17]/45">No search data yet.</p>
 )}
 </Panel>
 </div>
 </>
 ) : (
 <div className="rounded-2xl border border-[#5D0F17]/10 bg-white p-8 text-center text-sm text-[#5D0F17]/50">No analytics data available yet.</div>
 )}
 </div>
 )}

 {/* ── AUDIENCE ── */}
 {tab === "audience" && (
 <div className="space-y-8">
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
 <StatCard value={store.storeFollowers.toLocaleString()} label="Store followers" hint="Shoppers who saved your store" />
 <StatCard value={totalLikes.toLocaleString()} label="Total product likes" hint="Across all listed products" />
 <StatCard value={mostLiked ? mostLiked.favoriteCount : 0} label="Most liked product" hint={mostLiked?.title} />
 </div>

 <Panel title="Most liked products">
 {store.topFavoritedProducts.length > 0 ? (
 <div className="divide-y divide-[#5D0F17]/[0.06]">
 {store.topFavoritedProducts.map((p, i) => (
 <div key={i} className="flex items-center justify-between gap-4 px-6 py-3.5">
 <span className="truncate text-sm text-[#5D0F17]">{p.title}</span>
 <span className="flex shrink-0 items-center gap-4 text-sm text-[#5D0F17]/50">
 <span>${p.price}</span>
 <span className="inline-flex items-center gap-1">
 <Heart size={13} strokeWidth={1.7} className="fill-[#5D0F17]/15 text-[#5D0F17]/45" />
 {p.favoriteCount}
 </span>
 </span>
 </div>
 ))}
 </div>
 ) : (
 <p className="px-6 py-8 text-center text-sm text-[#5D0F17]/45">No saved products yet.</p>
 )}
 </Panel>
 </div>
 )}
 </div>
 </main>
 </div>
 </div>
 );
}
