"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PlusCircle, Package, ShoppingBag, Megaphone, BarChart3, Store, Heart, Eye, Sparkles, ArrowUp, ArrowLeft, SquarePen } from "lucide-react";
import { Card } from "@/app/store/ui";

type Overview = {
 revenueCents: number; orders: number; inventory: { active: number }; customers: number;
 productViews: number; favorites: number;
};
type Msg = { role: "user" | "assistant"; content: string };

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

const ASK_SUGGESTIONS = ["Build my storefront for me", "Write a description for a listing", "What sold best this month?", "Add a sale announcement bar"];

export default function WorkspaceHome() {
 const [name, setName] = useState("");
 const [ov, setOv] = useState<Overview | null>(null);
 const [ask, setAsk] = useState("");

 // In-page chat state — asking from the home bar turns the page into a conversation.
 const [chatMode, setChatMode] = useState(false);
 const [msgs, setMsgs] = useState<Msg[]>([]);
 const [chatInput, setChatInput] = useState("");
 const [busy, setBusy] = useState(false);
 const msgsRef = useRef<Msg[]>([]);
 const busyRef = useRef(false);
 const scroller = useRef<HTMLDivElement>(null);

 useEffect(() => {
 fetch("/api/store/me").then((r) => (r.ok ? r.json() : null)).then((d) => d && setName(d.storeName || "")).catch(() => {});
 fetch("/api/store/analytics/overview?days=30").then((r) => (r.ok ? r.json() : null)).then((d) => d && setOv(d)).catch(() => {});
 // Load any saved conversation so the chat (and its memory) continues where it left off.
 fetch("/api/store/assistant").then((r) => (r.ok ? r.json() : null)).then((d) => {
 if (d && Array.isArray(d.messages) && d.messages.length) { msgsRef.current = d.messages; setMsgs(d.messages); }
 }).catch(() => {});
 }, []);

 useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy, chatMode]);

 async function send(text: string) {
 const t = text.trim();
 if (!t || busyRef.current) return;
 const next = [...msgsRef.current, { role: "user" as const, content: t }];
 msgsRef.current = next; setMsgs(next); setChatInput(""); busyRef.current = true; setBusy(true);
 try {
 const r = await fetch("/api/store/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, page: "Home" }) });
 const d = await r.json();
 const reply = !r.ok ? (d.error || "Something went wrong.") : (d.reply || "(done)");
 const after = [...msgsRef.current, { role: "assistant" as const, content: reply }];
 msgsRef.current = after; setMsgs(after);
 if (r.ok && (d.actions || []).some((a: { name: string; ok: boolean }) => a.ok)) window.dispatchEvent(new Event("vya:store-updated"));
 } catch {
 const after = [...msgsRef.current, { role: "assistant" as const, content: "Couldn’t reach me just now — try again." }];
 msgsRef.current = after; setMsgs(after);
 }
 busyRef.current = false; setBusy(false);
 }

 function startChat(text: string) {
 const q = text.trim();
 if (!q) return;
 setChatMode(true);
 setAsk("");
 send(q);
 }

 async function newChat() {
 msgsRef.current = []; setMsgs([]); setChatInput("");
 await fetch("/api/store/assistant", { method: "DELETE" }).catch(() => {});
 }

 // ── Chat takes over the whole home surface ──
 if (chatMode) {
 return (
 <div className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-[100dvh]">
 <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
 <button onClick={() => setChatMode(false)} className="flex items-center gap-1.5 text-[13px] text-stone-500 transition hover:text-stone-900">
 <ArrowLeft size={16} /> Dashboard
 </button>
 <div className="flex items-center gap-2 text-[#5D0F17]"><Sparkles size={15} /><span className="text-sm font-medium">VYA</span></div>
 <button onClick={newChat} title="New chat" className="flex items-center gap-1.5 text-[13px] text-stone-500 transition hover:text-stone-900">
 <SquarePen size={15} /> New
 </button>
 </div>

 <div ref={scroller} className="flex-1 overflow-y-auto">
 <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
 {msgs.map((m, i) => (
 <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
 <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${m.role === "user" ? "rounded-br-sm bg-[#5D0F17] text-white" : "rounded-bl-sm bg-white text-stone-800 shadow-sm ring-1 ring-stone-200"}`}>{m.content}</div>
 </div>
 ))}
 {busy && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-[14px] text-stone-400 shadow-sm ring-1 ring-stone-200">…</div></div>}
 </div>
 </div>

 <div className="border-t border-stone-200 bg-white px-4 py-3 sm:px-6">
 <form
 onSubmit={(e) => { e.preventDefault(); send(chatInput); }}
 className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 transition focus-within:border-[#5D0F17]/40 focus-within:bg-white"
 >
 <textarea
 value={chatInput}
 onChange={(e) => setChatInput(e.target.value)}
 onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(chatInput); } }}
 placeholder="Ask VYA anything, or tell it to do something…"
 rows={1}
 className="max-h-32 flex-1 resize-none bg-transparent py-1 text-sm text-stone-800 outline-none placeholder:text-stone-400"
 />
 <button type="submit" disabled={busy || !chatInput.trim()} aria-label="Send" className="shrink-0 rounded-full bg-[#5D0F17] p-1.5 text-white transition hover:bg-[#5D0F17]/90 disabled:opacity-40">
 <ArrowUp size={15} />
 </button>
 </form>
 <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10px] text-stone-400">VYA remembers your chats and confirms before changing anything.</p>
 </div>
 </div>
 );
 }

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

 {/* Ask VYA — asking here opens a full-page chat with the buddy (shares memory with the Sidekick). */}
 <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
 <div className="flex items-center gap-2 text-[#5D0F17]">
 <Sparkles size={16} />
 <p className="text-[13px] font-medium">Ask VYA anything</p>
 </div>
 <form
 onSubmit={(e) => { e.preventDefault(); startChat(ask); }}
 className="mt-3 flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 transition focus-within:border-[#5D0F17]/40 focus-within:bg-white"
 >
 <input
 value={ask}
 onChange={(e) => setAsk(e.target.value)}
 placeholder="Build my storefront, write a listing, what sold best this week…"
 className="flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
 />
 <button type="submit" disabled={!ask.trim()} aria-label="Ask VYA" className="shrink-0 rounded-full bg-[#5D0F17] p-1.5 text-white transition hover:bg-[#5D0F17]/90 disabled:opacity-40">
 <ArrowUp size={15} />
 </button>
 </form>
 <div className="mt-2.5 flex flex-wrap gap-1.5">
 {ASK_SUGGESTIONS.map((s) => (
 <button key={s} onClick={() => startChat(s)} className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[12px] text-stone-600 transition hover:border-[#5D0F17]/30 hover:text-[#5D0F17]">{s}</button>
 ))}
 </div>
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
