"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, PageHeader, Button, Input, Field, cn } from "../ui";

type ShipFrom = { name?: string; street1?: string; street2?: string; city?: string; state?: string; zip?: string; country?: string; phone?: string };
type ShipMode = "buyer_pays" | "store_pays" | "free_over";

export default function SettingsPage() {
 // Pricing
 const [pct, setPct] = useState("");
 const [pBusy, setPBusy] = useState(false);
 const [pSaved, setPSaved] = useState(false);

 // Shipping
 const [mode, setMode] = useState<ShipMode>("buyer_pays");
 const [threshold, setThreshold] = useState("");
 const [from, setFrom] = useState<ShipFrom>({ country: "US" });
 const [sBusy, setSBusy] = useState(false);
 const [sSaved, setSSaved] = useState(false);
 const [sErr, setSErr] = useState<string | null>(null);

 useEffect(() => {
 fetch("/api/store/pricing").then((r) => (r.ok ? r.json() : null)).then((d) => d && setPct(String(d.minMarkupPct))).catch(() => {});
 fetch("/api/store/shipping").then((r) => (r.ok ? r.json() : null)).then((d) => {
 if (!d) return;
 setMode(d.mode || "buyer_pays");
 setThreshold(d.freeThresholdUsd != null ? String(d.freeThresholdUsd) : "");
 setFrom(d.shipFrom || { country: "US" });
 }).catch(() => {});
 }, []);

 async function savePricing() {
 setPBusy(true); setPSaved(false);
 await fetch("/api/store/pricing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ minMarkupPct: Number(pct) || 0 }) }).catch(() => {});
 setPBusy(false); setPSaved(true);
 }

 async function saveShipping() {
 setSBusy(true); setSSaved(false); setSErr(null);
 const need = ["street1", "city", "state", "zip"] as const;
 if (need.some((k) => !(from[k] || "").trim())) { setSErr("Add a full ship-from address (street, city, state, zip)."); setSBusy(false); return; }
 const r = await fetch("/api/store/shipping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, freeThresholdUsd: threshold === "" ? null : Number(threshold), shipFrom: from }) }).catch(() => null);
 if (r && r.ok) setSSaved(true); else setSErr("Couldn’t save.");
 setSBusy(false);
 }

 const setF = (k: keyof ShipFrom, v: string) => { setFrom((f) => ({ ...f, [k]: v })); setSSaved(false); };

 return (
 <div className="mx-auto max-w-2xl px-6 py-10 sm:px-8">
 <PageHeader title="Settings" subtitle="Pricing floor and shipping for your store." />

 {/* Pricing */}
 <Card className="mb-5">
 <CardHeader title="Pricing" subtitle="Your price floor — VYA never suggests below cost plus this markup. The market estimate can always go higher." />
 <div className="px-5 py-4">
 <Field label="Minimum markup over cost">
 <div className="flex items-center gap-2">
 <div className="w-24"><Input value={pct} onChange={(e) => { setPct(e.target.value.replace(/[^0-9.]/g, "")); setPSaved(false); }} inputMode="decimal" placeholder="30" /></div>
 <span className="text-[13px] text-stone-500">% minimum</span>
 <Button className="ml-auto" onClick={savePricing} disabled={pBusy}>{pBusy ? "Saving…" : "Save"}</Button>
 {pSaved && <span className="text-xs text-emerald-600">✓</span>}
 </div>
 </Field>
 </div>
 </Card>

 {/* Shipping */}
 <Card>
 <CardHeader title="Shipping" />
 <div className="space-y-5 px-5 py-4">
 <Field label="Ship-from address">
 <div className="grid grid-cols-2 gap-2">
 <Input className="col-span-2" value={from.name || ""} onChange={(e) => setF("name", e.target.value)} placeholder="Name / store" />
 <Input className="col-span-2" value={from.street1 || ""} onChange={(e) => setF("street1", e.target.value)} placeholder="Street address" />
 <Input className="col-span-2" value={from.street2 || ""} onChange={(e) => setF("street2", e.target.value)} placeholder="Apt, suite (optional)" />
 <Input value={from.city || ""} onChange={(e) => setF("city", e.target.value)} placeholder="City" />
 <Input value={from.state || ""} onChange={(e) => setF("state", e.target.value)} placeholder="State" />
 <Input value={from.zip || ""} onChange={(e) => setF("zip", e.target.value)} placeholder="ZIP" />
 <Input value={from.country || "US"} onChange={(e) => setF("country", e.target.value)} placeholder="Country (US)" />
 <Input className="col-span-2" value={from.phone || ""} onChange={(e) => setF("phone", e.target.value)} placeholder="Phone (required by carriers)" inputMode="tel" />
 </div>
 </Field>

 <div>
 <p className="mb-2 text-[13px] font-medium text-stone-700">Who pays for shipping</p>
 <div className="space-y-2">
 {([
 ["buyer_pays", "Buyer pays", "Live rate shown at checkout, added to the buyer’s total."],
 ["store_pays", "Free shipping (you absorb it)", "No shipping at checkout; you cover the label cost."],
 ["free_over", "Free over a threshold", "Buyer pays below the amount, free at/above it."],
 ] as const).map(([m, title, desc]) => (
 <label key={m} className={cn("flex cursor-pointer gap-3 rounded-lg border p-3 transition", mode === m ? "border-[#5D0F17] bg-[#5D0F17]/[0.03]" : "border-stone-200 hover:border-stone-300")}>
 <input type="radio" name="shipmode" checked={mode === m} onChange={() => { setMode(m); setSSaved(false); }} className="mt-0.5 accent-[#5D0F17]" />
 <span><span className="text-[13px] font-medium text-stone-900">{title}</span><br /><span className="text-xs text-stone-500">{desc}</span></span>
 </label>
 ))}
 </div>

 {mode === "free_over" && (
 <div className="mt-3 flex items-center gap-2">
 <span className="text-[13px] text-stone-500">Free shipping at $</span>
 <div className="w-24"><Input value={threshold} onChange={(e) => { setThreshold(e.target.value.replace(/[^0-9.]/g, "")); setSSaved(false); }} inputMode="decimal" placeholder="150" /></div>
 <span className="text-[13px] text-stone-500">and up</span>
 </div>
 )}
 </div>

 <div className="flex items-center gap-3">
 <Button onClick={saveShipping} disabled={sBusy}>{sBusy ? "Saving…" : "Save shipping"}</Button>
 {sSaved && <span className="text-xs text-emerald-600">Saved ✓</span>}
 {sErr && <span className="text-xs text-red-600">{sErr}</span>}
 </div>
 </div>
 </Card>

 <p className="mt-4 text-xs text-stone-400">You can also tell the VYA agent — e.g. “free shipping over $150” — and it’ll set this for you.</p>
 </div>
 );
}
