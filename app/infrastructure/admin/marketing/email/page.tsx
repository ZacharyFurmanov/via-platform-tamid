"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Card, CardHeader, PageHeader, Button, Input, Field } from "@/app/store/ui";

type DnsRecord = { record?: string; name?: string; type?: string; value?: string; ttl?: string; status?: string; priority?: number };
type Settings = { fromName: string | null; replyTo: string | null; domain: string | null; sendingEmail: string | null; verified: boolean; dnsRecords: DnsRecord[] | null };
type Sender = { fromName: string; fromAddress: string; replyTo: string | null; verified: boolean };

export default function EmailSenderPage() {
 const [settings, setSettings] = useState<Settings | null>(null);
 const [sender, setSender] = useState<Sender | null>(null);
 const [fromName, setFromName] = useState("");
 const [replyTo, setReplyTo] = useState("");
 const [domain, setDomain] = useState("");
 const [busy, setBusy] = useState<string | null>(null);
 const [msg, setMsg] = useState<string | null>(null);
 const [copied, setCopied] = useState<string | null>(null);

 function apply(d: { settings: Settings; sender: Sender }) {
 setSettings(d.settings); setSender(d.sender);
 setFromName(d.settings?.fromName || d.sender?.fromName || "");
 setReplyTo(d.settings?.replyTo || d.sender?.replyTo || "");
 }

 useEffect(() => {
 fetch("/api/store/email-domain").then((r) => (r.ok ? r.json() : null)).then((d) => d && apply(d)).catch(() => {});
 }, []);

 async function saveIdentity() {
 setBusy("identity"); setMsg(null);
 try {
 const r = await fetch("/api/store/email-domain", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fromName, replyTo }) });
 const d = await r.json();
 if (r.ok) { apply(d); setMsg("Saved."); } else setMsg(d.error || "Couldn’t save.");
 } catch { setMsg("Couldn’t save."); }
 setBusy(null);
 }
 async function addDomain() {
 setBusy("domain"); setMsg(null);
 try {
 const r = await fetch("/api/store/email-domain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain }) });
 const d = await r.json();
 if (r.ok) { setSettings(d.settings); setDomain(""); } else setMsg(d.error || "Couldn’t add domain.");
 } catch { setMsg("Couldn’t add domain."); }
 setBusy(null);
 }
 async function verify() {
 setBusy("verify"); setMsg(null);
 try {
 const r = await fetch("/api/store/email-domain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify" }) });
 const d = await r.json();
 if (r.ok) { setSettings(d.settings); setSender(d.sender); setMsg(d.verified ? "Verified! Your emails now send from your domain." : "Not verified yet — DNS can take a bit to propagate. Try again shortly."); }
 else setMsg(d.error || "Couldn’t verify.");
 } catch { setMsg("Couldn’t verify."); }
 setBusy(null);
 }
 async function copy(key: string, v: string) {
 try { await navigator.clipboard.writeText(v); setCopied(key); setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500); } catch { /* ignore */ }
 }

 return (
 <div className="mx-auto max-w-2xl px-6 py-10 sm:px-8">
 <PageHeader title="Sender" subtitle="How your marketing emails send — the name customers see, where replies go, and (optionally) your own domain." />

 {/* Sender identity */}
 <Card className="mb-5">
 <CardHeader title="Sender identity" subtitle="Shown as the sender on every automation + campaign." />
 <div className="space-y-3 px-5 py-4">
 <Field label="From name"><Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your store name" /></Field>
 <Field label="Reply-to email" hint="Where customer replies land."><Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="you@yourstore.com" /></Field>
 <div className="flex items-center gap-3 pt-1">
 <Button onClick={saveIdentity} disabled={busy === "identity"}>{busy === "identity" ? "Saving…" : "Save"}</Button>
 {sender && <span className="text-[12px] text-stone-500">Currently sends as <b className="text-stone-700">{sender.fromName}</b> &lt;{sender.fromAddress}&gt;</span>}
 </div>
 </div>
 </Card>

 {/* Domain authentication */}
 <Card>
 <CardHeader title="Send from your own domain" subtitle="Authenticate your domain so emails send FROM your address — better trust + deliverability." />
 <div className="px-5 py-4">
 {settings?.verified ? (
 <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3">
 <p className="text-[13px] font-medium text-emerald-800">✓ {settings.domain} is verified</p>
 <p className="mt-0.5 text-[12px] text-emerald-700/80">Emails now send from <b>{settings.sendingEmail}</b>.</p>
 </div>
 ) : settings?.domain ? (
 <>
 <p className="mb-3 text-[13px] text-stone-600">Add these records to <b>{settings.domain}</b>’s DNS, then verify. (At your registrar — GoDaddy, Namecheap, Cloudflare, etc.)</p>
 <div className="overflow-x-auto rounded-lg border border-stone-200">
 <table className="w-full text-[12px]">
 <thead><tr className="border-b border-stone-100 bg-stone-50 text-left text-[11px] uppercase tracking-[0.06em] text-stone-400"><th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 font-medium">Name</th><th className="px-3 py-2 font-medium">Value</th></tr></thead>
 <tbody className="divide-y divide-stone-100">
 {(settings.dnsRecords || []).map((rec, i) => (
 <tr key={i}>
 <td className="whitespace-nowrap px-3 py-2 font-mono text-stone-700">{rec.type}</td>
 <td className="px-3 py-2 font-mono text-stone-600"><span className="flex items-center gap-1"><span className="max-w-[140px] truncate">{rec.name}</span><button onClick={() => copy(`n${i}`, rec.name || "")} className="text-stone-300 hover:text-stone-600">{copied === `n${i}` ? <Check size={12} /> : <Copy size={12} />}</button></span></td>
 <td className="px-3 py-2 font-mono text-stone-600"><span className="flex items-center gap-1"><span className="max-w-[200px] truncate">{rec.value}</span><button onClick={() => copy(`v${i}`, rec.value || "")} className="text-stone-300 hover:text-stone-600">{copied === `v${i}` ? <Check size={12} /> : <Copy size={12} />}</button></span></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="mt-3 flex items-center gap-3">
 <Button onClick={verify} disabled={busy === "verify"}>{busy === "verify" ? "Checking…" : "Verify domain"}</Button>
 <span className="text-[11px] text-stone-400">DNS changes can take minutes to a few hours.</span>
 </div>
 </>
 ) : (
 <div className="flex flex-wrap items-end gap-2">
 <div className="flex-1"><Field label="Your domain"><Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourstore.com" /></Field></div>
 <Button onClick={addDomain} disabled={busy === "domain" || !domain.trim()}>{busy === "domain" ? "Adding…" : "Authenticate"}</Button>
 </div>
 )}
 </div>
 </Card>

 {msg && <p className="mt-3 text-[12px] text-stone-600">{msg}</p>}
 <p className="mt-3 text-[11px] text-stone-400">Until you authenticate a domain, emails send from your name via VYA’s shared sending domain — replies still route to you.</p>
 </div>
 );
}
