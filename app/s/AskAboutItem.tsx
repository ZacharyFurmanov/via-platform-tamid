"use client";

import { useState } from "react";

// A compact "Ask about this" affordance under a product. Opens an inline form,
// posts a question tied to the item, and hands the buyer a private thread link.
export default function AskAboutItem({ storeSlug, itemTitle, accent }: { storeSlug: string; itemTitle: string; accent: string }) {
 const [open, setOpen] = useState(false);
 const [email, setEmail] = useState("");
 const [message, setMessage] = useState("");
 const [token, setToken] = useState<string | null>(null);
 const [busy, setBusy] = useState(false);

 async function submit(e: React.FormEvent) {
 e.preventDefault();
 if (!message.trim()) return;
 setBusy(true);
 try {
 const r = await fetch("/api/contact", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ storeSlug, itemTitle, email, message }),
 });
 const d = await r.json().catch(() => ({}));
 if (d?.token) setToken(d.token);
 } catch {
 /* ignore */
 }
 setBusy(false);
 }

 if (token) {
 return (
 <p className="mt-1.5 text-[11px] opacity-60">
 Sent —{" "}
 <a href={`/thread/${token}`} className="underline hover:opacity-100">follow the reply →</a>
 </p>
 );
 }

 if (!open) {
 return (
 <button onClick={() => setOpen(true)} className="mt-1.5 text-[11px] underline opacity-50 hover:opacity-100">
 Ask about this
 </button>
 );
 }

 const field = "w-full border border-black/20 bg-white/70 px-2.5 py-1.5 text-[12px] outline-none focus:border-black/50";
 return (
 <form onSubmit={submit} className="mt-1.5 flex flex-col gap-1.5" onClick={(e) => e.preventDefault()}>
 <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email (for the reply)" className={field} />
 <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={2} placeholder={`Question about "${itemTitle}"`} className={field} />
 <button type="submit" disabled={busy} className="self-start px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white disabled:opacity-50" style={{ background: accent }}>
 {busy ? "Sending…" : "Send"}
 </button>
 </form>
 );
}
