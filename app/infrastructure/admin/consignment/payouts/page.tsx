"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = { id: number; name: string; method: string; portalToken: string | null; balanceCents: number; payableCents: number };

const money = (c: number) => `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const METHOD_LABEL: Record<string, string> = { stripe: "Direct deposit", store_credit: "Store credit", cash: "Cash", check: "Check" };

export default function PayoutsPage() {
 const [rows, setRows] = useState<Row[]>([]);
 const [holdDays, setHoldDays] = useState(14);
 const [loading, setLoading] = useState(true);
 const [paying, setPaying] = useState<number | null>(null);
 const [copied, setCopied] = useState(false);
 const [err, setErr] = useState<string | null>(null);
 const [payMethod, setPayMethod] = useState<Record<number, string>>({});

 async function reload() {
 const r = await fetch("/api/store/consignment/payouts");
 const d = await r.json().catch(() => null);
 if (r.ok && d) { setRows(d.consignors || []); setHoldDays(d.holdDays ?? 14); }
 }
 useEffect(() => {
 fetch("/api/store/consignment/payouts").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setRows(d.consignors || []); setHoldDays(d.holdDays ?? 14); } }).catch(() => {}).finally(() => setLoading(false));
 }, []);

 async function pay(id: number, method: string) {
 setPaying(id); setErr(null);
 const r = await fetch("/api/store/consignment/payouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consignorId: id, method }) });
 const d = await r.json().catch(() => null);
 setPaying(null);
 if (!r.ok) { setErr(d?.error || "Couldn't record the payout."); return; }
 reload();
 }
 function copyPortal() {
 const url = `${window.location.origin}/consignor`;
 navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
 }

 const totalPayable = rows.reduce((s, r) => s + r.payableCents, 0);

 return (
 <div className="mx-auto max-w-4xl px-8 py-10">
 <div className="flex items-center gap-3">
 <Link href="/infrastructure/admin/consignment" className="text-[13px] text-stone-400 hover:text-stone-700">← Consignment</Link>
 </div>
 <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-stone-900">Payouts</h1>
 <p className="mt-1 text-[13px] text-stone-500">What each consignor is owed, and what&rsquo;s ready to pay now (sale credits older than your {holdDays}-day return hold).</p>
 <button onClick={copyPortal} className="mt-3 rounded-lg border border-stone-200 px-3 py-1.5 text-[12.5px] text-stone-600 hover:bg-stone-50">{copied ? "Copied!" : "Copy consignor portal link"}</button>
 <p className="mt-1.5 text-[11px] text-stone-400">Consignors sign in there with their email to see their own statement.</p>

 {totalPayable > 0 && (
 <div className="mt-5 inline-flex items-baseline gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-white">
 <span className="text-[12px] text-stone-300">Ready to pay out</span>
 <span className="text-[15px] font-semibold tabular-nums">{money(totalPayable)}</span>
 </div>
 )}

 {err && <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700 ring-1 ring-rose-200">{err}</div>}

 <div className="mt-6 overflow-x-auto rounded-xl border border-stone-200 bg-white">
 <table className="w-full text-[13px]">
 <thead>
 <tr className="border-b border-stone-100 text-left text-[11px] uppercase tracking-wide text-stone-400">
 <th className="px-4 py-3 font-medium">Consignor</th>
 <th className="px-4 py-3 font-medium">Method</th>
 <th className="px-4 py-3 text-right font-medium">Balance</th>
 <th className="px-4 py-3 text-right font-medium">Payable now</th>
 <th className="px-4 py-3"></th>
 </tr>
 </thead>
 <tbody>
 {loading ? (
 <tr><td colSpan={5} className="px-4 py-10 text-center text-stone-400">Loading&hellip;</td></tr>
 ) : rows.length === 0 ? (
 <tr><td colSpan={5} className="px-4 py-10 text-center text-stone-400">No active consignors yet.</td></tr>
 ) : rows.map((c) => (
 <tr key={c.id} className="border-b border-stone-50 last:border-0">
 <td className="px-4 py-3 font-medium text-stone-900">{c.name}</td>
 <td className="px-4 py-3 text-stone-500">{METHOD_LABEL[c.method] ?? c.method}</td>
 <td className="px-4 py-3 text-right tabular-nums text-stone-700">{money(c.balanceCents)}</td>
 <td className="px-4 py-3 text-right font-medium tabular-nums text-stone-900">{money(c.payableCents)}</td>
 <td className="px-4 py-3">
 <div className="flex items-center justify-end gap-2">
 <select value={payMethod[c.id] ?? c.method} onChange={(e) => setPayMethod({ ...payMethod, [c.id]: e.target.value })} className="rounded-lg border border-stone-200 px-2 py-1.5 text-[12px] text-stone-600 outline-none focus:border-stone-400" aria-label="Payout method">
 <option value="stripe">Direct deposit</option>
 <option value="cash">Cash</option>
 <option value="check">Check</option>
 <option value="store_credit">Store credit</option>
 </select>
 <button onClick={() => pay(c.id, payMethod[c.id] ?? c.method)} disabled={c.payableCents <= 0 || paying === c.id} className="rounded-lg bg-stone-900 px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-stone-800 disabled:opacity-30">{paying === c.id ? "…" : `Pay ${money(c.payableCents)}`}</button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 <p className="mt-4 text-[11px] text-stone-400">With auto-pay on (in Settings), direct-deposit payouts run on their own once a sale clears your return window. Use <b>Pay</b> here for a manual payout, or for cash / check / store credit.</p>
 </div>
 );
}
