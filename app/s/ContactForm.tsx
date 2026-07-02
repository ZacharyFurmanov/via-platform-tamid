"use client";

import { useState } from "react";

export default function ContactForm({ accent, storeSlug }: { accent: string; storeSlug: string }) {
 const [name, setName] = useState("");
 const [email, setEmail] = useState("");
 const [message, setMessage] = useState("");
 const [done, setDone] = useState(false);
 const [busy, setBusy] = useState(false);

 async function submit(e: React.FormEvent) {
 e.preventDefault();
 if (!message.trim()) return;
 setBusy(true);
 try {
 await fetch("/api/contact", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ storeSlug, name, email, message }),
 });
 } catch {
 /* still acknowledge */
 }
 setDone(true);
 setBusy(false);
 }

 if (done) return <p className="mt-8 text-sm opacity-70">Thanks — your message has been sent. We’ll be in touch.</p>;

 const field = "w-full border border-black/20 bg-white/60 px-4 py-2.5 text-sm outline-none focus:border-black/50";
 return (
 <form onSubmit={submit} className="mx-auto mt-8 flex max-w-md flex-col gap-3">
 <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={field} />
 <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={field} />
 <textarea value={message} onChange={(e) => setMessage(e.target.value)} required placeholder="Message" rows={5} className={field} />
 <button
 type="submit"
 disabled={busy}
 className="mt-1 self-start px-8 py-2.5 text-[11px] uppercase tracking-[0.18em] text-white transition hover:opacity-90 disabled:opacity-50"
 style={{ background: accent }}
 >
 {busy ? "Sending…" : "Send"}
 </button>
 </form>
 );
}
