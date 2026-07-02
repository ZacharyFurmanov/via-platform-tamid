"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, Package, ShoppingBag, Megaphone, BarChart3, Store, Heart, Eye } from "lucide-react";
import { Card } from "@/app/store/ui";

type Overview = {
 revenueCents: number; orders: number; inventory: { active: number }; customers: number;
 productViews: number; favorites: number;
};

const money = (c: number) => `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const B = "/infrastructure/admin";

const ACTIONS = [
 { href: `${B}/add-listing`, icon: PlusCircle, title: "Add a listing", body: "Snap a photo — AI drafts the title, price, and description." },
 { href: `${B}/inventory`, icon: Package, title: "Inventory", body: "Manage your one-of-one pieces and drops." },
 { href: `${B}/orders`, icon: ShoppingBag, title: "Orders", body: "Fulfill sales and print shipping labels." },
 { href: `${B}/marketing/campaigns`, icon: Megaphone, title: "Marketing", body: "Campaigns, discounts, automations, and your sender." },
 { href: `${B}/storefront`, icon: Store, title: "Storefront", body: "Design your shop and bring your existing site over." },
 { href: `${B}/dashboard`, icon: BarChart3, title: "Analytics", body: "Revenue, best sellers, and what shoppers love." },
];

export default function WorkspaceHome() {
 const [name, setName] = useState("");
 const [ov, setOv] = useState<Overview | null>(null);

 useEffect(() => {
 fetch("/api/store/me").then((r) => (r.ok ? r.json() : null)).then((d) => d && setName(d.storeName || "")).catch(() => {});
 fetch("/api/store/analytics/overview?days=30").then((r) => (r.ok ? r.json() : null)).then((d) => d && setOv(d)).catch(() => {});
 }, []);

 const stats = [
 { label: "Revenue · 30d", value: ov ? money(ov.revenueCents) : "—" },
 { label: "Orders · 30d", value: ov ? ov.orders.toLocaleString() : "—" },
 { label: "Active listings", value: ov ? ov.inventory.active.toLocaleString() : "—" },
 { label: "Customers", value: ov ? ov.customers.toLocaleString() : "—" },
 ];

 return (
 <div className="mx-auto max-w-4xl px-6 py-10 sm:px-8">
 <div className="mb-6">
 <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-stone-900">Welcome back{name ? `, ${name}` : ""}</h1>
 <p className="mt-1 text-sm text-stone-500">Your store’s command center.</p>
 </div>

 <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
 {stats.map((s) => (
 <Card key={s.label} className="p-4">
 <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-400">{s.label}</p>
 <p className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">{s.value}</p>
 </Card>
 ))}
 </div>

 {ov && (ov.productViews > 0 || ov.favorites > 0) && (
 <div className="mb-8 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-stone-500">
 <span className="inline-flex items-center gap-1.5"><Eye size={14} className="text-stone-400" /><b className="tabular-nums text-stone-800">{ov.productViews.toLocaleString()}</b> product views · 30d</span>
 <span className="inline-flex items-center gap-1.5"><Heart size={14} className="text-stone-400" /><b className="tabular-nums text-stone-800">{ov.favorites.toLocaleString()}</b> favorites · 30d</span>
 </div>
 )}

 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
 {ACTIONS.map((a) => {
 const Icon = a.icon;
 return (
 <Link key={a.href} href={a.href} className="group rounded-xl border border-stone-200 bg-white p-5 transition hover:border-stone-300 hover:shadow-md">
 <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#5D0F17]/[0.07] text-[#5D0F17]"><Icon size={17} strokeWidth={1.75} /></span>
 <p className="text-[14px] font-medium text-stone-900">{a.title}</p>
 <p className="mt-0.5 text-[12.5px] leading-relaxed text-stone-500">{a.body}</p>
 </Link>
 );
 })}
 </div>
 </div>
 );
}
