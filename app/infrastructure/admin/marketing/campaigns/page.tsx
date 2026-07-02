"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, PageHeader, Button, Input, Field, inputCls, cn } from "@/app/store/ui";

export default function CampaignsPage() {
 const [subject, setSubject] = useState("");
 const [msg, setMsg] = useState("");
 const [link, setLink] = useState("");
 const [camp, setCamp] = useState<{ recipientCount: number; storeEmail: string | null } | null>(null);
 const [sending, setSending] = useState(false);
 const [campMsg, setCampMsg] = useState<string | null>(null);

 useEffect(() => {
 fetch("/api/store/campaign").then((r) => (r.ok ? r.json() : null)).then((d) => d && setCamp(d)).catch(() => {});
 }, []);

 async function send(test: boolean) {
 if (!subject.trim() || !msg.trim()) { setCampMsg("Add a subject and a message."); return; }
 if (!test && !window.confirm(`Send this to ${camp?.recipientCount ?? 0} customers? This can't be undone.`)) return;
 setSending(true); setCampMsg(null);
 try {
 const r = await fetch("/api/store/campaign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, body: msg, link, test }) });
 const d = await r.json();
 if (!r.ok) setCampMsg(d.error || "Couldn’t send.");
 else if (test) setCampMsg(`Test sent to ${d.sentTo}. Check your inbox.`);
 else setCampMsg(`Sent to ${d.sent} customer${d.sent === 1 ? "" : "s"}${d.failed ? ` (${d.failed} failed)` : ""}. ✓`);
 } catch { setCampMsg("Couldn’t send."); }
 setSending(false);
 }

 return (
 <div className="mx-auto max-w-2xl px-6 py-10 sm:px-8">
 <PageHeader title="Campaigns" subtitle="Email your customers as your store — replies go to your contact address." />
 <Card>
 <CardHeader title="New email campaign" subtitle={`Sends with your store’s name — replies go to ${camp?.storeEmail || "your contact email"}`} />
 <div className="space-y-3 px-5 py-4">
 <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="New drop just landed ✨" /></Field>
 <Field label="Message"><textarea className={cn(inputCls, "h-40 py-2 leading-relaxed")} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Write to your customers — what just landed, a sale, a restock…" /></Field>
 <Field label="Button link" hint="Where “Shop now” points. Defaults to your store.">
 <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://yourstore.com" />
 </Field>
 <div className="flex flex-wrap items-center gap-2 pt-1">
 <Button variant="secondary" onClick={() => send(true)} disabled={sending}>Send test to myself</Button>
 <Button onClick={() => send(false)} disabled={sending || !camp?.recipientCount}>{sending ? "Sending…" : `Send to ${camp?.recipientCount ?? 0} customer${camp?.recipientCount === 1 ? "" : "s"}`}</Button>
 {campMsg && <span className="text-xs text-stone-600">{campMsg}</span>}
 </div>
 <p className="text-[11px] text-stone-400">Tip: send a test first. Links are tagged so email traffic shows up in Audience + Performance.</p>
 </div>
 </Card>
 </div>
 );
}
