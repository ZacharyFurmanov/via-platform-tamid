"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { Card, PageHeader, Badge, Stat, EmptyState } from "../ui";
import { useStoreBase } from "../nav-base";

type Order = {
 id: string;
 itemTitle: string | null;
 amountCents: number;
 currency: string;
 buyerEmail: string | null;
 status: string;
 paidAt: string | null;
};

function tone(status: string): "success" | "warning" | "neutral" | "info" {
 const s = (status || "").toLowerCase();
 if (s.includes("paid") || s.includes("complete") || s.includes("fulfill")) return "success";
 if (s.includes("pend") || s.includes("process") || s.includes("unfulfill")) return "warning";
 if (s.includes("refund") || s.includes("cancel")) return "neutral";
 return "info";
}

export default function OrdersPage() {
 const router = useRouter();
 const base = useStoreBase();
 const [loading, setLoading] = useState(true);
 const [authErr, setAuthErr] = useState<string | null>(null);
 const [orders, setOrders] = useState<Order[]>([]);

 useEffect(() => {
 (async () => {
 try {
 const r = await fetch("/api/store/orders");
 if (!r.ok) {
 setAuthErr(r.status === 401 ? "Sign in as your store to see orders." : "Couldn’t load orders.");
 setLoading(false);
 return;
 }
 const d = await r.json();
 setOrders(d.orders || []);
 } catch {
 setAuthErr("Couldn’t load orders.");
 }
 setLoading(false);
 })();
 }, []);

 if (loading) return <div className="flex items-center justify-center py-32 text-sm text-stone-400">Loading…</div>;
 if (authErr) return <div className="flex items-center justify-center py-32 text-sm text-stone-500">{authErr}</div>;

 const revenue = orders.reduce((a, o) => a + (o.amountCents || 0), 0);
 const aov = orders.length ? revenue / orders.length : 0;

 return (
 <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
 <PageHeader title="Orders" subtitle="Sales from your storefront. Payouts settle to your bank automatically." />

 {orders.length > 0 && (
 <div className="mb-6 grid grid-cols-3 gap-3">
 <Stat label="Orders" value={orders.length} />
 <Stat label="Revenue" value={`$${(revenue / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
 <Stat label="Avg. order" value={`$${(aov / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
 </div>
 )}

 {orders.length === 0 ? (
 <EmptyState icon={<ShoppingBag size={28} strokeWidth={1.5} />} title="No orders yet" body="When a buyer checks out on your storefront, the order shows up here." />
 ) : (
 <Card className="overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-[13px]">
 <thead>
 <tr className="border-b border-stone-100 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-stone-400">
 <th className="px-5 py-2.5 font-medium">Item</th>
 <th className="px-5 py-2.5 font-medium">Customer</th>
 <th className="px-5 py-2.5 font-medium">Date</th>
 <th className="px-5 py-2.5 font-medium">Status</th>
 <th className="px-5 py-2.5 text-right font-medium">Amount</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-stone-100">
 {orders.map((o) => (
 <tr key={o.id} onClick={() => router.push(`${base}/orders/${o.id}`)} className="cursor-pointer transition hover:bg-stone-50">
 <td className="max-w-[260px] truncate px-5 py-3 font-medium text-stone-900">{o.itemTitle || "Item"}</td>
 <td className="px-5 py-3 text-stone-600">{o.buyerEmail || "—"}</td>
 <td className="px-5 py-3 tabular-nums text-stone-500">{o.paidAt ? new Date(o.paidAt).toLocaleDateString() : "—"}</td>
 <td className="px-5 py-3"><Badge tone={tone(o.status)} dot>{o.status}</Badge></td>
 <td className="px-5 py-3 text-right font-medium tabular-nums text-stone-900">${(o.amountCents / 100).toFixed(2)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Card>
 )}
 </div>
 );
}
