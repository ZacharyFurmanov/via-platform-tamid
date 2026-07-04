"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Consignor = { id: number; name: string; email: string | null; phone: string | null; defaultSplitPct: number | null; payoutMethod: string | null; status: string; balanceCents: number };

const label = "block text-[11px] font-medium uppercase tracking-wide text-stone-500 mb-1";
const input = "w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-stone-400";
const money = (c: number) => `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function ConsignmentPage() {
 const [rows, setRows] = useState<Consignor[]>([]);
 const [loading, setLoading] = useState(true);
 const [form, setForm] = useState({ name: "", email: "", phone: "", defaultSplitPct: "" });
 const [saving, setSaving] = useState(false);
 const [err, setErr] = useState<string | null>(null);

 async function reload() {
 const r = await fetch("/api/store/consignment/consignors");
 const d = await r.json().catch(() => null);
 if (r.ok && d) setRows(d.consignors || []);
 }
 useEffect(() => {
 fetch("/api/store/consignment/consignors").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setRows(d.consignors || []); }).catch(() => {}).finally(() => setLoading(false));
 }, []);

 async function add(e: React.FormEvent) {
 e.preventDefault();
 if (!form.name.trim()) { setErr("A name is required."); return; }
 setSaving(true); setErr(null);
 const r = await fetch("/api/store/consignment/consignors", {
 method: "POST", headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, defaultSplitPct: form.defaultSplitPct ? Number(form.defaultSplitPct) : null }),
 });
 const d = await r.json().catch(() => null);
 setSaving(false);
 if (!r.ok) { setErr(d?.error || "Couldn't add the consignor."); return; }
 setForm({ name: "", email: "", phone: "", defaultSplitPct: "" });
 reload();
 }

 async function patchConsignor(id: number, patch: Record<string, unknown>) {
 await fetch("/api/store/consignment/consignors", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
 reload();
 }

 async function removeConsignor(id: number, name: string) {
 if (!window.confirm(`Remove ${name}? This deletes their consignment records. To just hide them instead, click their status to deactivate.`)) return;
 await fetch(`/api/store/consignment/consignors?id=${id}`, { method: "DELETE" });
 reload();
 }

 const owed = rows.reduce((s, c) => s + c.balanceCents, 0);

 return (
 <div className="mx-auto max-w-4xl px-8 py-10">
 <div className="flex items-end justify-between">
 <div>
 <h1 className="text-[22px] font-semibold tracking-tight text-stone-900">Consignment</h1>
 <p className="mt-1 text-[13px] text-stone-500">Your consignors, their splits, and what they&rsquo;re owed.</p>
 </div>
 <Link href="/infrastructure/admin/consignment/settings" className="rounded-lg border border-stone-200 px-3.5 py-2 text-[13px] text-stone-700 transition hover:bg-stone-50">Settings</Link>
 </div>

 {rows.length > 0 && (
 <div className="mt-5 inline-flex items-baseline gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-white">
 <span className="text-[12px] text-stone-300">Total owed to consignors</span>
 <span className="text-[15px] font-semibold tabular-nums">{money(owed)}</span>
 </div>
 )}

 <form onSubmit={add} className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
 <p className="mb-3 text-[12px] font-medium text-stone-700">Add a consignor</p>
 <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
 <div><label className={label}>Name</label><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" /></div>
 <div><label className={label}>Email</label><input className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="optional" /></div>
 <div><label className={label}>Phone</label><input className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="optional" /></div>
 <div><label className={label}>Default split %</label><input className={input} value={form.defaultSplitPct} onChange={(e) => setForm({ ...form, defaultSplitPct: e.target.value.replace(/[^0-9]/g, "") })} inputMode="numeric" placeholder="e.g. 60" /></div>
 </div>
 {err && <p className="mt-2 text-[12px] text-rose-600">{err}</p>}
 <div className="mt-3"><button disabled={saving} className="rounded-lg bg-stone-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-stone-800 disabled:opacity-50">{saving ? "Adding…" : "Add consignor"}</button></div>
 <p className="mt-2 text-[11px] text-stone-400">Leave the split blank to use your store rules. Set it here to override for this person.</p>
 </form>

 <div className="mt-6 overflow-x-auto rounded-xl border border-stone-200 bg-white">
 <table className="w-full text-[13px]">
 <thead>
 <tr className="border-b border-stone-100 text-left text-[11px] uppercase tracking-wide text-stone-400">
 <th className="px-4 py-3 font-medium">Consignor</th>
 <th className="px-4 py-3 font-medium">Default split</th>
 <th className="px-4 py-3 text-right font-medium">Balance owed</th>
 <th className="px-4 py-3 font-medium">Status</th>
 </tr>
 </thead>
 <tbody>
 {loading ? (
 <tr><td colSpan={4} className="px-4 py-10 text-center text-stone-400">Loading&hellip;</td></tr>
 ) : rows.length === 0 ? (
 <tr><td colSpan={4} className="px-4 py-10 text-center text-stone-400">No consignors yet &mdash; add your first above.</td></tr>
 ) : rows.map((c) => (
 <tr key={c.id} className="border-b border-stone-50 last:border-0">
 <td className="px-4 py-3">
 <div className="font-medium text-stone-900">{c.name}</div>
 <div className="text-[12px] text-stone-400">{[c.email, c.phone].filter(Boolean).join(" · ") || "—"}</div>
 </td>
 <td className="px-4 py-3">
 <input
 defaultValue={c.defaultSplitPct ?? ""}
 onBlur={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); patchConsignor(c.id, { defaultSplitPct: v ? Number(v) : null }); }}
 className="w-16 rounded border border-stone-200 px-2 py-1 text-[13px] tabular-nums outline-none focus:border-stone-400"
 inputMode="numeric" placeholder="store rule" aria-label={`Default split for ${c.name}`}
 />
 {c.defaultSplitPct != null && <span className="ml-1 text-stone-400">%</span>}
 </td>
 <td className="px-4 py-3 text-right font-medium tabular-nums text-stone-900">{money(c.balanceCents)}</td>
 <td className="px-4 py-3">
 <div className="flex items-center gap-3">
 <button onClick={() => patchConsignor(c.id, { status: c.status === "active" ? "inactive" : "active" })} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${c.status === "active" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}>{c.status}</button>
 <button onClick={() => removeConsignor(c.id, c.name)} className="text-[16px] leading-none text-stone-300 transition hover:text-rose-500" title="Remove consignor" aria-label={`Remove ${c.name}`}>&times;</button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
}
