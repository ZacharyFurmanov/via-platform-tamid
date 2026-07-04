"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Settings = { payoutMethods: string[]; defaultPayoutMethod: string; payoutCycle: string; holdDays: number; autoPayout: boolean; storeCreditBonusPct: number | null; storeDefaultSplitPct: number; requireAgreement: boolean; agreementTerms: string | null; collectW9: boolean };
type Rule = { minPriceCents: number; maxPriceCents: number | null; category: string | null; splitPct: number };

const PAYOUT_METHODS = [
 { key: "stripe", label: "Direct deposit (Stripe)" },
 { key: "store_credit", label: "Store credit" },
 { key: "cash", label: "Cash" },
 { key: "check", label: "Check" },
];
const CYCLES = ["weekly", "biweekly", "monthly", "on_demand"];

const label = "block text-[11px] font-medium uppercase tracking-wide text-stone-500 mb-1";
const input = "w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-stone-400";
const card = "rounded-xl border border-stone-200 bg-white p-5";
const h2 = "text-[14px] font-semibold text-stone-900";
const dollars = (c: number | null) => (c == null ? "" : String(Math.round(c / 100)));
const toCents = (s: string) => { const n = Number(s.replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? Math.round(n * 100) : 0; };

export default function ConsignmentSettingsPage() {
 const [settings, setSettings] = useState<Settings | null>(null);
 const [rules, setRules] = useState<Rule[]>([]);
 const [saving, setSaving] = useState(false);
 const [savedAt, setSavedAt] = useState<number | null>(null);

 useEffect(() => {
 fetch("/api/store/consignment/config").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setSettings(d.settings); setRules(d.splitRules || []); } }).catch(() => {});
 }, []);

 function set<K extends keyof Settings>(k: K, v: Settings[K]) { setSettings((s) => (s ? { ...s, [k]: v } : s)); }
 function toggleMethod(key: string) {
 if (!settings) return;
 const has = settings.payoutMethods.includes(key);
 const next = has ? settings.payoutMethods.filter((m) => m !== key) : [...settings.payoutMethods, key];
 set("payoutMethods", next.length ? next : [key]);
 if (!next.includes(settings.defaultPayoutMethod)) set("defaultPayoutMethod", next[0] || key);
 }

 async function save() {
 if (!settings) return;
 setSaving(true);
 const r = await fetch("/api/store/consignment/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings, splitRules: rules }) });
 const d = await r.json().catch(() => null);
 setSaving(false);
 if (r.ok && d) { setSettings(d.settings); setRules(d.splitRules || []); setSavedAt(Date.now()); }
 }

 if (!settings) return <div className="px-8 py-10 text-[13px] text-stone-400">Loading…</div>;

 return (
 <div className="mx-auto max-w-3xl px-8 py-10">
 <div className="flex items-center gap-3">
 <Link href="/infrastructure/admin/consignment" className="text-[13px] text-stone-400 hover:text-stone-700">← Consignment</Link>
 </div>
 <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-stone-900">Consignment settings</h1>
 <p className="mt-1 text-[13px] text-stone-500">How your store pays consignors and splits sales.</p>

 <div className="mt-7 space-y-5">

 {/* Payouts */}
 <div className={card}>
 <p className={h2}>Payouts</p>
 <p className="mb-4 mt-0.5 text-[12px] text-stone-500">Which methods you offer, and your payout rhythm.</p>
 <div className="flex flex-wrap gap-2">
 {PAYOUT_METHODS.map((m) => {
 const on = settings.payoutMethods.includes(m.key);
 return <button key={m.key} onClick={() => toggleMethod(m.key)} className={`rounded-lg border px-3 py-1.5 text-[12.5px] transition ${on ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}>{m.label}</button>;
 })}
 </div>
 <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
 <div>
 <label className={label}>Default method</label>
 <select className={input} value={settings.defaultPayoutMethod} onChange={(e) => set("defaultPayoutMethod", e.target.value)}>
 {settings.payoutMethods.map((k) => <option key={k} value={k}>{PAYOUT_METHODS.find((m) => m.key === k)?.label ?? k}</option>)}
 </select>
 </div>
 <div>
 <label className={label}>Payout cycle</label>
 <select className={input} value={settings.payoutCycle} onChange={(e) => set("payoutCycle", e.target.value)}>
 {CYCLES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
 </select>
 </div>
 <div><label className={label}>Pay out after (days)</label><input className={input} value={settings.holdDays} onChange={(e) => set("holdDays", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)} inputMode="numeric" placeholder="0 = final sale" /></div>
 <div><label className={label}>Store-credit bonus %</label><input className={input} value={settings.storeCreditBonusPct ?? ""} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); set("storeCreditBonusPct", v ? Number(v) : null); }} inputMode="numeric" placeholder="none" /></div>
 </div>
 <p className="mt-2 text-[11px] text-stone-400">Your return window. A sale becomes payable this many days after it sells — set 0 for final sale (immediate).</p>
 <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
 <div><p className="text-[13px] font-medium text-stone-800">Auto-pay via direct deposit</p><p className="mt-0.5 text-[12px] text-stone-500">Once a sale clears the window above, automatically send connected consignors&rsquo; balances to their bank &mdash; no clicking. Cash, check, and store credit stay manual.</p></div>
 <button onClick={() => set("autoPayout", !settings.autoPayout)} className={`ml-4 h-6 w-11 shrink-0 rounded-full p-0.5 transition ${settings.autoPayout ? "bg-stone-900" : "bg-stone-200"}`} aria-label="Toggle auto-payout"><span className={`block h-5 w-5 rounded-full bg-white transition ${settings.autoPayout ? "translate-x-5" : ""}`} /></button>
 </div>
 </div>

 {/* Splits */}
 <div className={card}>
 <p className={h2}>Splits</p>
 <p className="mb-4 mt-0.5 text-[12px] text-stone-500">The consignor&rsquo;s cut. A consignor&rsquo;s own rate wins; otherwise the first matching band here; otherwise the default.</p>
 <div className="mb-4 flex items-center gap-2">
 <label className="text-[12.5px] text-stone-600">Store default</label>
 <input className="w-16 rounded border border-stone-200 px-2 py-1 text-[13px] tabular-nums" value={settings.storeDefaultSplitPct} onChange={(e) => set("storeDefaultSplitPct", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)} inputMode="numeric" />
 <span className="text-[12.5px] text-stone-400">% to the consignor</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-[12.5px]">
 <thead><tr className="text-left text-[10.5px] uppercase tracking-wide text-stone-400"><th className="pb-2 pr-3 font-medium">Min $</th><th className="pb-2 pr-3 font-medium">Max $</th><th className="pb-2 pr-3 font-medium">Category</th><th className="pb-2 pr-3 font-medium">Consignor %</th><th></th></tr></thead>
 <tbody>
 {rules.map((r, i) => (
 <tr key={i}>
 <td className="py-1 pr-3"><input className="w-20 rounded border border-stone-200 px-2 py-1 tabular-nums" value={dollars(r.minPriceCents)} onChange={(e) => setRules(rules.map((x, j) => j === i ? { ...x, minPriceCents: toCents(e.target.value) } : x))} inputMode="numeric" /></td>
 <td className="py-1 pr-3"><input className="w-20 rounded border border-stone-200 px-2 py-1 tabular-nums" value={dollars(r.maxPriceCents)} onChange={(e) => setRules(rules.map((x, j) => j === i ? { ...x, maxPriceCents: e.target.value.trim() ? toCents(e.target.value) : null } : x))} inputMode="numeric" placeholder="& up" /></td>
 <td className="py-1 pr-3"><input className="w-28 rounded border border-stone-200 px-2 py-1" value={r.category ?? ""} onChange={(e) => setRules(rules.map((x, j) => j === i ? { ...x, category: e.target.value.trim() || null } : x))} placeholder="any" /></td>
 <td className="py-1 pr-3"><input className="w-16 rounded border border-stone-200 px-2 py-1 tabular-nums" value={r.splitPct} onChange={(e) => setRules(rules.map((x, j) => j === i ? { ...x, splitPct: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 } : x))} inputMode="numeric" /></td>
 <td className="py-1"><button onClick={() => setRules(rules.filter((_, j) => j !== i))} className="text-stone-300 hover:text-rose-500" aria-label="Remove rule">×</button></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <button onClick={() => setRules([...rules, { minPriceCents: 0, maxPriceCents: null, category: null, splitPct: settings.storeDefaultSplitPct }])} className="mt-3 rounded-lg border border-stone-200 px-3 py-1.5 text-[12.5px] text-stone-600 hover:bg-stone-50">+ Add band</button>
 </div>

 {/* Agreement */}
 <div className={card}>
 <div className="flex items-center justify-between">
 <div><p className={h2}>Consignor agreement</p><p className="mt-0.5 text-[12px] text-stone-500">The terms a consignor accepts before you take their items.</p></div>
 <button onClick={() => set("requireAgreement", !settings.requireAgreement)} className={`h-6 w-11 rounded-full p-0.5 transition ${settings.requireAgreement ? "bg-stone-900" : "bg-stone-200"}`} aria-label="Toggle require agreement"><span className={`block h-5 w-5 rounded-full bg-white transition ${settings.requireAgreement ? "translate-x-5" : ""}`} /></button>
 </div>
 <textarea className={`${input} mt-4 min-h-[120px]`} value={settings.agreementTerms ?? ""} onChange={(e) => set("agreementTerms", e.target.value || null)} placeholder="Your consignment terms — ownership stays with the consignor until sold, the split, who bears loss, what happens to unsold goods, payment timing…" />
 <label className="mt-3 flex items-center gap-2 text-[12.5px] text-stone-600">
 <input type="checkbox" checked={settings.collectW9} onChange={(e) => set("collectW9", e.target.checked)} />
 Collect a W-9 at signup (stay 1099-ready — Stripe gathers this automatically)
 </label>
 </div>

 </div>

 <div className="sticky bottom-4 mt-6 flex items-center gap-3">
 <button onClick={save} disabled={saving} className="rounded-lg bg-stone-900 px-5 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50">{saving ? "Saving…" : "Save settings"}</button>
 {savedAt && <span className="text-[12px] text-emerald-600">Saved</span>}
 </div>
 </div>
 );
}
