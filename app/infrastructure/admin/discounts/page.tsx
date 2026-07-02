"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Card, PageHeader, Badge, Button, Input, cn } from "@/app/store/ui";

type Discount = { id: number; code: string; label: string | null; kind: string; value: number | null; active: boolean; autoApply: boolean };

const selectCls = "h-9 rounded-md border border-stone-300 bg-white px-2 text-[13px] text-stone-900 outline-none focus:border-stone-400";

function kindLabel(d: Discount): string {
 if (d.kind === "percent") return d.value ? `${d.value}% off` : "% off";
 if (d.kind === "fixed") return d.value ? `$${d.value} off` : "$ off";
 if (d.kind === "free_shipping") return "Free shipping";
 return d.label || "Discount";
}

export default function DiscountsPage() {
 const [discounts, setDiscounts] = useState<Discount[]>([]);
 const [newCode, setNewCode] = useState("");
 const [newKind, setNewKind] = useState("percent");
 const [newValue, setNewValue] = useState("");
 const [busy, setBusy] = useState(false);

 useEffect(() => {
 fetch("/api/store/discounts").then((r) => (r.ok ? r.json() : null)).then((d) => d && setDiscounts(d.discounts || [])).catch(() => {});
 }, []);

 async function add() {
 if (!newCode.trim()) return;
 setBusy(true);
 try {
 const r = await fetch("/api/store/discounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: newCode, kind: newKind, value: newValue ? Number(newValue) : null }) });
 const d = await r.json();
 if (r.ok) { setDiscounts(d.discounts); setNewCode(""); setNewValue(""); }
 } catch { /* ignore */ }
 setBusy(false);
 }
 async function patch(id: number, p: { active?: boolean; autoApply?: boolean }) {
 const r = await fetch("/api/store/discounts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...p }) });
 const d = await r.json().catch(() => null);
 if (r.ok && d) setDiscounts(d.discounts);
 }
 async function remove(id: number) {
 if (!window.confirm("Remove this code?")) return;
 const r = await fetch("/api/store/discounts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
 const d = await r.json().catch(() => null);
 if (r.ok && d) setDiscounts(d.discounts);
 }

 const active = discounts.filter((d) => d.active).length;

 return (
 <div className="mx-auto max-w-2xl px-6 py-10 sm:px-8">
 <PageHeader title="Discounts" subtitle="Codes shoppers get when they click through from VYA. Star one to auto-apply it on click-through." />

 <div className="mb-5 grid grid-cols-3 gap-3">
 <Card className="p-4"><p className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-400">Codes</p><p className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{discounts.length}</p></Card>
 <Card className="p-4"><p className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-400">Active</p><p className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{active}</p></Card>
 <Card className="p-4"><p className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-400">Auto-applies</p><p className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{discounts.filter((d) => d.autoApply).length}</p></Card>
 </div>

 <Card className="p-5">
 {discounts.length > 0 && (
 <div className="mb-4 divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200">
 {discounts.map((d) => (
 <div key={d.id} className="flex items-center gap-2.5 px-3 py-2.5">
 <span className="font-mono text-[13px] font-medium text-stone-900">{d.code}</span>
 <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-500">{kindLabel(d)}</span>
 {d.autoApply && <Badge tone="accent">Auto-applies</Badge>}
 {!d.active && <Badge tone="neutral">Off</Badge>}
 <div className="ml-auto flex items-center gap-3">
 <button onClick={() => patch(d.id, { autoApply: !d.autoApply })} title="Auto-apply on click-through (only one)" className={cn("text-sm leading-none", d.autoApply ? "text-[#5D0F17]" : "text-stone-300 hover:text-stone-500")}>{d.autoApply ? "★" : "☆"}</button>
 <button onClick={() => patch(d.id, { active: !d.active })} className={cn("text-[11px] font-medium", d.active ? "text-stone-500 hover:text-stone-900" : "text-emerald-600")}>{d.active ? "Disable" : "Enable"}</button>
 <button onClick={() => remove(d.id)} className="text-stone-300 transition hover:text-red-600"><X size={14} /></button>
 </div>
 </div>
 ))}
 </div>
 )}
 <div className="flex flex-wrap items-center gap-2">
 <div className="w-36"><Input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="WELCOME10" /></div>
 <select value={newKind} onChange={(e) => setNewKind(e.target.value)} className={selectCls}>
 <option value="percent">% off</option>
 <option value="fixed">$ off</option>
 <option value="free_shipping">Free shipping</option>
 <option value="other">Other</option>
 </select>
 {(newKind === "percent" || newKind === "fixed") && <div className="w-20"><Input value={newValue} onChange={(e) => setNewValue(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={newKind === "percent" ? "10" : "25"} /></div>}
 <Button onClick={add} disabled={busy || !newCode.trim()}>Add code</Button>
 </div>
 <p className="mt-2 text-[11px] text-stone-400">★ auto-applies the code when a shopper clicks through from VYA — only one can. Others are for campaigns + your store page.</p>
 </Card>
 </div>
 );
}
