"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, PageHeader, EmptyState } from "@/app/store/ui";
import { BarChart3 } from "lucide-react";

type Data = {
 periodDays: number | "all";
 revenueCents: number;
 orders: number;
 aovCents: number;
 revenueByDay: { day: string; cents: number }[];
 inventory: { active: number; draft: number; sold: number; activeValueCents: number };
 topBrands: { brand: string; sold: number; revenueCents: number }[];
 recentSales: { title: string; amountCents: number; at: string | null }[];
 customers: number;
 buyers: number;
 sessions: number;
 productViews: number;
 favorites: number;
 topViewed: { itemId: string; title: string; count: number }[];
 topFavorited: { itemId: string; title: string; count: number }[];
 topSearches: { query: string; count: number }[];
};

const money = (c: number) => `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—");
const B = "/infrastructure/admin";

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
 return (
 <Card className="p-4">
 <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-400">{label}</p>
 <p className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">{value}</p>
 {hint && <p className="mt-0.5 text-[11px] text-stone-400">{hint}</p>}
 </Card>
 );
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

export default function AnalyticsPage() {
 const [range, setRange] = useState<"30" | "90" | "all">("30");
 const [data, setData] = useState<Data | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 let active = true;
 (async () => {
 setLoading(true);
 try {
 const r = await fetch(`/api/store/analytics/overview?days=${range}`);
 if (r.ok && active) setData(await r.json());
 } catch { /* keep prior */ }
 if (active) setLoading(false);
 })();
 return () => { active = false; };
 }, [range]);

 const nothing = data && data.revenueCents === 0 && data.orders === 0 && data.inventory.active === 0 && data.inventory.sold === 0 && data.customers === 0;

 return (
 <div className="mx-auto max-w-4xl px-6 py-8">
 <PageHeader
 title="Analytics"
 subtitle="Your store’s business at a glance — sales, inventory, and customers."
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
 <EmptyState icon={<BarChart3 size={28} strokeWidth={1.5} />} title="No activity yet" body="Once you publish listings and make sales, your revenue, best sellers, and customers will show up here." />
 ) : data ? (
 <div className="space-y-6">
 {/* headline stats */}
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
 <Stat label="Revenue" value={money(data.revenueCents)} hint={data.periodDays === "all" ? "all time" : `last ${data.periodDays}d`} />
 <Stat label="Orders" value={data.orders.toLocaleString()} />
 <Stat label="Avg. order" value={data.orders ? money(data.aovCents) : "—"} />
 <Stat label="Items sold" value={data.inventory.sold.toLocaleString()} />
 </div>

 {/* revenue chart */}
 {data.revenueByDay.length >= 2 && (
 <Card className="p-5">
 <p className="mb-3 text-[13px] font-medium text-stone-700">Revenue over time</p>
 <RevenueChart data={data.revenueByDay} />
 </Card>
 )}

 <div className="grid gap-4 sm:grid-cols-2">
 {/* inventory */}
 <Card className="p-5">
 <p className="mb-3 text-[13px] font-medium text-stone-700">Inventory</p>
 <div className="space-y-2 text-[13px]">
 <div className="flex justify-between"><span className="text-stone-500">Active listings</span><Link href={`${B}/inventory`} className="font-medium tabular-nums text-stone-900 hover:underline">{data.inventory.active}</Link></div>
 <div className="flex justify-between"><span className="text-stone-500">Inventory value</span><span className="font-medium tabular-nums text-stone-900">{money(data.inventory.activeValueCents)}</span></div>
 <div className="flex justify-between"><span className="text-stone-500">Drafts</span><Link href={`${B}/inventory/drafts`} className="font-medium tabular-nums text-stone-900 hover:underline">{data.inventory.draft}</Link></div>
 <div className="flex justify-between"><span className="text-stone-500">Sold (all time)</span><span className="font-medium tabular-nums text-stone-900">{data.inventory.sold}</span></div>
 </div>
 </Card>

 {/* audience */}
 <Card className="p-5">
 <p className="mb-3 text-[13px] font-medium text-stone-700">Audience</p>
 <div className="space-y-2 text-[13px]">
 <div className="flex justify-between"><span className="text-stone-500">Customers</span><Link href={`${B}/customers`} className="font-medium tabular-nums text-stone-900 hover:underline">{data.customers.toLocaleString()}</Link></div>
 <div className="flex justify-between"><span className="text-stone-500">Buyers</span><Link href={`${B}/customers/buyers`} className="font-medium tabular-nums text-stone-900 hover:underline">{data.buyers.toLocaleString()}</Link></div>
 <div className="flex justify-between"><span className="text-stone-500">Sessions{data.periodDays === "all" ? "" : ` (${data.periodDays}d)`}</span><Link href={`${B}/performance`} className="font-medium tabular-nums text-stone-900 hover:underline">{data.sessions.toLocaleString()}</Link></div>
 <div className="flex justify-between"><span className="text-stone-500">Product views</span><span className="font-medium tabular-nums text-stone-900">{data.productViews.toLocaleString()}</span></div>
 <div className="flex justify-between"><span className="text-stone-500">Favorites</span><span className="font-medium tabular-nums text-stone-900">{data.favorites.toLocaleString()}</span></div>
 </div>
 </Card>
 </div>

 {/* what shoppers want — views + favorites */}
 <div className="grid gap-4 sm:grid-cols-2">
 <Card className="p-5">
 <p className="mb-3 text-[13px] font-medium text-stone-700">Most viewed</p>
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
 <p className="mb-3 text-[13px] font-medium text-stone-700">Most favorited</p>
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

 {/* what shoppers search for */}
 <Card className="p-5">
 <p className="mb-3 text-[13px] font-medium text-stone-700">Top searches</p>
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

 {/* best sellers + recent sales */}
 <div className="grid gap-4 sm:grid-cols-2">
 <Card className="p-5">
 <p className="mb-3 text-[13px] font-medium text-stone-700">Top brands by revenue</p>
 {data.topBrands.length === 0 ? (
 <p className="py-4 text-center text-[12px] text-stone-400">No sales in this period.</p>
 ) : (
 <div className="space-y-2">
 {data.topBrands.map((b) => (
 <div key={b.brand} className="flex items-center justify-between text-[13px]">
 <span className="truncate text-stone-700">{b.brand}</span>
 <span className="shrink-0 tabular-nums text-stone-900">{money(b.revenueCents)} <span className="text-stone-400">· {b.sold}</span></span>
 </div>
 ))}
 </div>
 )}
 </Card>

 <Card className="p-5">
 <p className="mb-3 text-[13px] font-medium text-stone-700">Recent sales</p>
 {data.recentSales.length === 0 ? (
 <p className="py-4 text-center text-[12px] text-stone-400">No sales yet.</p>
 ) : (
 <div className="space-y-2">
 {data.recentSales.map((s, i) => (
 <div key={i} className="flex items-center justify-between text-[13px]">
 <span className="max-w-[180px] truncate text-stone-700">{s.title}</span>
 <span className="shrink-0 tabular-nums text-stone-900">{money(s.amountCents)} <span className="text-stone-400">· {shortDate(s.at)}</span></span>
 </div>
 ))}
 </div>
 )}
 </Card>
 </div>
 </div>
 ) : null}
 </div>
 );
}
