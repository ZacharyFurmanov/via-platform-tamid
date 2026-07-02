"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Msg = { sender: "buyer" | "store"; body: string; createdAt: string };

export default function ThreadPage() {
 const { token } = useParams<{ token: string }>();
 const [itemTitle, setItemTitle] = useState<string | null>(null);
 const [messages, setMessages] = useState<Msg[]>([]);
 const [body, setBody] = useState("");
 const [loaded, setLoaded] = useState(false);
 const [notFound, setNotFound] = useState(false);

 const load = useCallback(async () => {
 try {
 const r = await fetch(`/api/thread?token=${token}`);
 if (!r.ok) { setNotFound(true); setLoaded(true); return; }
 const d = await r.json();
 setItemTitle(d.itemTitle);
 setMessages(d.messages || []);
 } catch {
 setNotFound(true);
 }
 setLoaded(true);
 }, [token]);

 useEffect(() => { load(); }, [load]);

 async function send(e: React.FormEvent) {
 e.preventDefault();
 if (!body.trim()) return;
 await fetch("/api/thread", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, body }) }).catch(() => {});
 setBody("");
 load();
 }

 if (loaded && notFound) {
 return <main className="flex min-h-screen items-center justify-center text-sm opacity-60">This conversation could not be found.</main>;
 }

 return (
 <main className="mx-auto min-h-screen max-w-2xl px-6 py-12" style={{ background: "#FFFDF8", color: "#241c17" }}>
 <a href="/" className="text-lg tracking-[0.2em]" style={{ fontFamily: "Georgia, serif" }}>VYA</a>
 <h1 className="mt-8 text-2xl" style={{ fontFamily: "Georgia, serif" }}>{itemTitle ? `About: ${itemTitle}` : "Your conversation"}</h1>
 <div className="mt-6 flex flex-col gap-3">
 {messages.map((m, i) => (
 <div key={i} className={m.sender === "store" ? "self-start" : "self-end"} style={{ maxWidth: "80%" }}>
 <div
 className="rounded-2xl px-4 py-2.5 text-sm"
 style={m.sender === "store" ? { background: "#efe9df" } : { background: "#241c17", color: "#FFFDF8" }}
 >
 {m.body}
 </div>
 <p className={"mt-1 text-[10px] opacity-40 " + (m.sender === "store" ? "text-left" : "text-right")}>{m.sender === "store" ? "Store" : "You"}</p>
 </div>
 ))}
 {!messages.length && loaded && <p className="text-sm opacity-50">No messages yet.</p>}
 </div>
 <form onSubmit={send} className="mt-6 flex gap-2">
 <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply…" className="flex-1 border border-black/20 bg-white px-3 py-2 text-sm outline-none focus:border-black/50" />
 <button type="submit" className="px-5 py-2 text-[11px] uppercase tracking-[0.16em] text-white" style={{ background: "#241c17" }}>Send</button>
 </form>
 </main>
 );
}
