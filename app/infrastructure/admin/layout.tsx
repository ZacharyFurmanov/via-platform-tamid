"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, PlusCircle, Package, ShoppingBag, MessageCircle, Store, Plug, Users, Megaphone, Tag, LineChart, CreditCard, BarChart3, Settings, Target, TrendingUp, Share2, LogOut, type LucideIcon } from "lucide-react";
import Sidekick from "@/app/store/Sidekick";

type Sub = { href: string; label: string };
type NavItem = { href: string; label: string; icon: LucideIcon; children?: Sub[] };
const B = "/infrastructure/admin";
const GROUPS: { label?: string; items: NavItem[] }[] = [
 { items: [{ href: `${B}/home`, label: "Home", icon: Home }] },
 {
 label: "Sell",
 items: [
 { href: `${B}/add-listing`, label: "Add listing", icon: PlusCircle },
 {
 href: `${B}/inventory`, label: "Inventory", icon: Package,
 children: [
 { href: `${B}/inventory/drafts`, label: "Drafts" },
 { href: `${B}/inventory/sold`, label: "Sold" },
 ],
 },
 { href: `${B}/cross-listing`, label: "Cross-listing", icon: Share2 },
 { href: `${B}/orders`, label: "Orders", icon: ShoppingBag },
 { href: `${B}/inbox`, label: "Inbox", icon: MessageCircle },
 ],
 },
 {
 label: "Store",
 items: [
 { href: `${B}/storefront`, label: "Storefront", icon: Store },
 { href: `${B}/import`, label: "Bring your site", icon: Plug },
 {
 href: `${B}/customers`, label: "Customers", icon: Users,
 children: [{ href: `${B}/customers/buyers`, label: "Buyers" }],
 },
 {
 href: `${B}/marketing`, label: "Marketing", icon: Megaphone,
 children: [
 { href: `${B}/marketing/campaigns`, label: "Campaigns" },
 { href: `${B}/marketing/email`, label: "Sender" },
 { href: `${B}/marketing/audience`, label: "Audience" },
 { href: `${B}/marketing/share-links`, label: "Share links" },
 { href: `${B}/marketing/automations`, label: "Automations" },
 ],
 },
 { href: `${B}/discounts`, label: "Discounts", icon: Tag },
 { href: `${B}/performance`, label: "Performance", icon: LineChart },
 ],
 },
 {
 label: "Business",
 items: [
 { href: `${B}/payments`, label: "Payments", icon: CreditCard },
 { href: `${B}/dashboard`, label: "Analytics", icon: BarChart3 },
 { href: `${B}/settings`, label: "Settings", icon: Settings },
 ],
 },
 { label: "Platform", items: [
 { href: `${B}/trends`, label: "Trends", icon: TrendingUp },
 { href: `${B}/ai`, label: "AI accuracy", icon: Target },
 ] },
];

export default function InfrastructureLayout({ children }: { children: React.ReactNode }) {
 const pathname = usePathname();
 const router = useRouter();
 const [ok, setOk] = useState<boolean | null>(null);

 useEffect(() => {
 fetch("/api/infrastructure/whoami").then((r) => setOk(r.ok)).catch(() => setOk(false));
 }, []);

 useEffect(() => {
 if (ok === false) router.replace("/admin/login?redirect=/infrastructure/admin");
 }, [ok, router]);

 if (ok !== true) {
 return <div className="flex min-h-screen items-center justify-center text-sm text-stone-400">{ok === false ? "Redirecting…" : "Loading…"}</div>;
 }

 const within = (href: string) => pathname === href || pathname.startsWith(href + "/");

 return (
 <div className="flex min-h-screen bg-stone-50" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
 <aside className="fixed left-0 top-0 flex h-screen w-[220px] flex-col overflow-y-auto border-r border-stone-200 bg-white px-3 py-5">
 <div className="px-3 pb-4">
 <p className="text-[15px] font-semibold tracking-tight text-stone-900">Infrastructure</p>
 <p className="text-[11px] text-stone-400">VYA platform · owner workspace</p>
 </div>
 <nav className="flex-1">
 {GROUPS.map((g, gi) => (
 <div key={gi} className={gi === 0 ? "" : "mt-4"}>
 {g.label && <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400">{g.label}</p>}
 <div className="space-y-0.5">
 {g.items.map((n) => {
 const active = within(n.href);
 const Icon = n.icon;
 return (
 <div key={n.href}>
 <Link
 href={n.href}
 className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition ${active ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
 >
 <Icon size={16} strokeWidth={1.75} className={active ? "" : "text-stone-400"} />
 {n.label}
 </Link>
 {/* Shopify-style sub-tabs: revealed when the section is active. */}
 {n.children && active && (
 <div className="mb-1 ml-[30px] mt-0.5 space-y-0.5 border-l border-stone-200 pl-2">
 {n.children.map((c) => {
 const on = pathname === c.href;
 return (
 <Link key={c.href} href={c.href} className={`block rounded-md px-2.5 py-1.5 text-[12.5px] transition ${on ? "font-medium text-stone-900" : "text-stone-500 hover:text-stone-900"}`}>
 {c.label}
 </Link>
 );
 })}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>
 ))}
 </nav>
 <div className="mt-3 border-t border-stone-100 pt-3">
 <Link href="/admin" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-stone-400 hover:bg-stone-100 hover:text-stone-600">
 <LogOut size={15} strokeWidth={1.75} /> Marketplace admin
 </Link>
 </div>
 </aside>
 <main className="ml-[220px] flex-1">{children}</main>
 <Sidekick />
 </div>
 );
}
