"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Card, PageHeader, Badge, Button, EmptyState, inputCls, cn } from "../ui";

type Conv = {
 id: number;
 buyerName: string | null;
 buyerEmail: string | null;
 itemTitle: string | null;
 lastMessage: string | null;
 storeUnread: number;
 lastMessageAt: string;
};
type Msg = { id: number; sender: "buyer" | "store"; body: string; createdAt: string };

export default function InboxPage() {
 const [convs, setConvs] = useState<Conv[]>([]);
 const [active, setActive] = useState<Conv | null>(null);
 const [messages, setMessages] = useState<Msg[]>([]);
 const [body, setBody] = useState("");
 const [loading, setLoading] = useState(true);

 const loadList = useCallback(async () => {
 try {
 const r = await fetch("/api/store/inbox");
 if (r.ok) setConvs((await r.json()).conversations || []);
 } catch {
 /* ignore */
 }
 setLoading(false);
 }, []);
 useEffect(() => { (async () => { await loadList(); })(); }, [loadList]);

 const loadMessages = useCallback(async (id: number) => {
 const r = await fetch(`/api/store/inbox/${id}`);
 if (r.ok) setMessages((await r.json()).messages || []);
 }, []);

 async function open(c: Conv) {
 setActive(c);
 setMessages([]);
 await loadMessages(c.id);
 loadList();
 }

 async function reply(e: React.FormEvent) {
 e.preventDefault();
 if (!body.trim() || !active) return;
 await fetch(`/api/store/inbox/${active.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) }).catch(() => {});
 setBody("");
 loadMessages(active.id);
 }

 return (
 <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
 <PageHeader title="Inbox" subtitle="Questions buyers asked about your items." />

 <div className="grid gap-5 md:grid-cols-[320px_1fr]">
 {/* Conversation list */}
 <Card className="divide-y divide-stone-100 overflow-hidden">
 {loading ? (
 <p className="p-4 text-[13px] text-stone-400">Loading…</p>
 ) : convs.length === 0 ? (
 <p className="p-5 text-[13px] text-stone-400">No messages yet.</p>
 ) : (
 convs.map((c) => (
 <button
 key={c.id}
 onClick={() => open(c)}
 className={cn("flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-stone-50", active?.id === c.id && "bg-stone-50")}
 >
 <div className="flex items-center justify-between gap-2">
 <span className="text-[13px] font-medium text-stone-900">{c.buyerName || c.buyerEmail || "Buyer"}</span>
 {c.storeUnread > 0 && <Badge tone="accent">{c.storeUnread}</Badge>}
 </div>
 {c.itemTitle && <span className="text-[11px] uppercase tracking-[0.06em] text-stone-400">{c.itemTitle}</span>}
 <span className="line-clamp-1 text-xs text-stone-500">{c.lastMessage}</span>
 </button>
 ))
 )}
 </Card>

 {/* Thread */}
 <Card className="flex flex-col">
 {!active ? (
 <div className="flex-1 py-8"><EmptyState icon={<MessageCircle size={26} strokeWidth={1.5} />} title="Select a conversation" body="Pick a buyer on the left to read and reply." /></div>
 ) : (
 <>
 <div className="border-b border-stone-100 px-5 py-3.5">
 <p className="text-[13px] font-semibold text-stone-900">{active.buyerName || "Buyer"}</p>
 {active.buyerEmail && <p className="text-xs text-stone-500">{active.buyerEmail}</p>}
 {active.itemTitle && <p className="mt-0.5 text-[11px] uppercase tracking-[0.06em] text-stone-400">Re: {active.itemTitle}</p>}
 </div>
 <div className="flex max-h-[50vh] flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
 {messages.map((m) => (
 <div key={m.id} className={m.sender === "store" ? "self-end" : "self-start"} style={{ maxWidth: "80%" }}>
 <div className={cn("rounded-2xl px-3.5 py-2 text-[13px]", m.sender === "store" ? "bg-[#5D0F17] text-white" : "bg-stone-100 text-stone-800")}>{m.body}</div>
 </div>
 ))}
 {!messages.length && <p className="text-[13px] text-stone-400">No messages.</p>}
 </div>
 <form onSubmit={reply} className="flex gap-2 border-t border-stone-100 px-5 py-3">
 <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply…" className={inputCls} />
 <Button type="submit" disabled={!body.trim()}>Send</Button>
 </form>
 </>
 )}
 </Card>
 </div>
 </div>
 );
}
