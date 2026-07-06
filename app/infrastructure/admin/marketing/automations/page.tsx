"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Sparkles, Heart, Eye, RotateCcw, Zap, Plus, X } from "lucide-react";
import { Card, PageHeader, Button, Input, Field, cn } from "@/app/store/ui";
import EmailEditor from "@/app/store/EmailEditor";

type Builtin = { kind: "builtin"; key: string; name: string; body: string; cadence: string; enabled: boolean };
type Custom = { kind: "custom"; id: number; name: string; trigger: string; subject: string; body: string; enabled: boolean };
type Trigger = { value: string; label: string };
type Data = { builtin: Builtin[]; custom: Custom[]; triggers: Trigger[] };

const ICONS: Record<string, typeof ShoppingCart> = { abandoned_cart: ShoppingCart, new_arrivals: Sparkles, saved_search: Heart, viewed_item: Eye, winback: RotateCcw };

function Toggle({ on, onClick, busy }: { on: boolean; onClick: () => void; busy?: boolean }) {
 return (
 <button onClick={onClick} disabled={busy} role="switch" aria-checked={on} className={cn("relative h-5 w-9 shrink-0 rounded-full transition", on ? "bg-emerald-500" : "bg-stone-300", busy && "opacity-60")}>
 <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", on ? "left-[18px]" : "left-0.5")} />
 </button>
 );
}

export default function AutomationsPage() {
 const [data, setData] = useState<Data | null>(null);
 const [busyKey, setBusyKey] = useState<string | null>(null);
 const [adding, setAdding] = useState(false);
 const [form, setForm] = useState({ name: "", trigger: "new_listing", subject: "", body: "" });
 const [saving, setSaving] = useState(false);
 const [err, setErr] = useState<string | null>(null);

 useEffect(() => {
 fetch("/api/store/automations").then((r) => (r.ok ? r.json() : null)).then((d) => d && setData(d)).catch(() => {});
 }, []);

 async function toggle(body: object, key: string) {
 setBusyKey(key);
 try {
 const r = await fetch("/api/store/automations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
 if (r.ok) setData((await r.json()) as Data);
 } catch { /* ignore */ }
 setBusyKey(null);
 }
 async function create() {
 setSaving(true); setErr(null);
 try {
 const r = await fetch("/api/store/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
 const d = await r.json();
 if (!r.ok) setErr(d.error || "Couldn’t save.");
 else { setData(d as Data); setAdding(false); setForm({ name: "", trigger: "new_listing", subject: "", body: "" }); }
 } catch { setErr("Couldn’t save."); }
 setSaving(false);
 }
 async function removeCustom(id: number) {
 if (!window.confirm("Delete this automation?")) return;
 const r = await fetch("/api/store/automations", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
 if (r.ok) setData((await r.json()) as Data);
 }

 const triggerLabel = (v: string) => data?.triggers.find((t) => t.value === v)?.label || v;

 return (
 <div className="mx-auto max-w-2xl px-6 py-10 sm:px-8">
 <PageHeader
 title="Automations"
 subtitle="Emails that send for you automatically. Toggle VYA’s flows, or build your own."
 actions={<Button onClick={() => { setErr(null); setAdding(true); }}><Plus size={15} className="-ml-0.5 mr-1 inline" />New automation</Button>}
 />

 {/* Built-in flows */}
 <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">VYA flows</p>
 <div className="mb-6 space-y-2.5">
 {(data?.builtin || []).map((f) => {
 const Icon = ICONS[f.key] || Zap;
 return (
 <Card key={f.key} className="flex items-start gap-3.5 p-4">
 <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5D0F17]/[0.07] text-[#5D0F17]"><Icon size={17} strokeWidth={1.75} /></span>
 <div className="min-w-0 flex-1">
 <p className="text-[14px] font-medium text-stone-900">{f.name}</p>
 <p className="mt-0.5 text-[13px] leading-relaxed text-stone-500">{f.body}</p>
 <p className="mt-1 text-[11px] text-stone-400">{f.cadence}</p>
 </div>
 <Toggle on={f.enabled} busy={busyKey === f.key} onClick={() => toggle({ kind: "builtin", key: f.key, enabled: !f.enabled }, f.key)} />
 </Card>
 );
 })}
 </div>

 {/* Custom automations */}
 <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">Your automations</p>
 {data && data.custom.length === 0 && !adding && (
 <Card className="p-6 text-center text-[13px] text-stone-500">No custom automations yet. <button onClick={() => setAdding(true)} className="font-medium text-[#5D0F17] underline">Create one</button> to email customers on a trigger you choose.</Card>
 )}
 <div className="space-y-2.5">
 {(data?.custom || []).map((c) => (
 <Card key={c.id} className="flex items-start gap-3.5 p-4">
 <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500"><Zap size={17} strokeWidth={1.75} /></span>
 <div className="min-w-0 flex-1">
 <p className="text-[14px] font-medium text-stone-900">{c.name}</p>
 <p className="mt-0.5 text-[12px] text-stone-500">{triggerLabel(c.trigger)} → “{c.subject}”</p>
 </div>
 <div className="flex shrink-0 items-center gap-3">
 <Toggle on={c.enabled} busy={busyKey === `c${c.id}`} onClick={() => toggle({ kind: "custom", id: c.id, enabled: !c.enabled }, `c${c.id}`)} />
 <button onClick={() => removeCustom(c.id)} className="text-stone-300 transition hover:text-red-600"><X size={15} /></button>
 </div>
 </Card>
 ))}
 </div>

 <p className="mt-4 text-[11px] text-stone-400">Automations honor each customer’s email-subscription status.</p>

 {/* Create modal */}
 {adding && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={() => setAdding(false)}>
 <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
 <h2 className="mb-4 text-base font-semibold text-stone-900">New automation</h2>
 <div className="space-y-3">
 <Field label="Name"><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Welcome new customers" /></Field>
 <Field label="Trigger — when it sends">
 <select value={form.trigger} onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))} className="h-9 w-full rounded-md border border-stone-300 bg-white px-2 text-[13px] text-stone-900 outline-none focus:border-stone-400">
 {(data?.triggers || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
 </select>
 </Field>
 <Field label="Subject"><Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Welcome to the family ✨" /></Field>
 <Field label="Message"><EmailEditor body={form.body} onBody={(v) => setForm((f) => ({ ...f, body: v }))} subject={form.subject} link="" placeholder="Thanks for joining — here’s what to expect…" /></Field>
 </div>
 {err && <p className="mt-3 text-xs text-red-600">{err}</p>}
 <div className="mt-5 flex items-center justify-end gap-2">
 <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
 <Button disabled={saving || !form.name.trim() || !form.subject.trim() || !form.body.trim()} onClick={create}>{saving ? "Saving…" : "Create automation"}</Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
