"use client";

import { useEffect, useState } from "react";
import { CreditCard, Landmark, ShieldCheck } from "lucide-react";
import { Card, PageHeader, Badge, Button } from "../ui";

type Status = {
 configured: boolean;
 connected: boolean;
 chargesEnabled: boolean;
 payoutsEnabled: boolean;
 detailsSubmitted: boolean;
};

export default function PaymentsPage() {
 const [loading, setLoading] = useState(true);
 const [authErr, setAuthErr] = useState<string | null>(null);
 const [s, setS] = useState<Status | null>(null);
 const [busy, setBusy] = useState(false);
 const [err, setErr] = useState<string | null>(null);

 async function load() {
 try {
 const r = await fetch("/api/store/payments");
 if (!r.ok) {
 setAuthErr(r.status === 401 ? "Sign in as your store to set up payments." : "Couldn’t load payment status.");
 setLoading(false);
 return;
 }
 setS(await r.json());
 } catch {
 setAuthErr("Couldn’t load payment status.");
 }
 setLoading(false);
 }
 useEffect(() => {
 (async () => { await load(); })();
 }, []);

 async function connect() {
 setBusy(true);
 setErr(null);
 try {
 const r = await fetch("/api/store/payments/connect", { method: "POST" });
 const d = await r.json();
 if (!r.ok || !d.url) {
 setErr(d.error || "Couldn’t start onboarding.");
 setBusy(false);
 return;
 }
 window.location.href = d.url; // hand off to Stripe-hosted onboarding
 } catch {
 setErr("Couldn’t start onboarding.");
 setBusy(false);
 }
 }

 const active = s?.chargesEnabled && s?.payoutsEnabled;

 if (loading) return <div className="flex items-center justify-center py-32 text-sm text-stone-400">Loading…</div>;
 if (authErr) return <div className="flex items-center justify-center py-32 text-sm text-stone-500">{authErr}</div>;

 return (
 <div className="mx-auto max-w-2xl px-6 py-10 sm:px-8">
 <PageHeader title="Payments" subtitle="Accept payments on your storefront and settle to your own bank. You’re the merchant of record — VYA just powers the checkout." />

 {!s?.configured ? (
 <Card className="p-6 text-sm text-stone-500">Payments aren’t enabled on the server yet.</Card>
 ) : (
 <Card className="p-6">
 <div className="flex items-start gap-4">
 <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5D0F17]/[0.07] text-[#5D0F17]"><CreditCard size={18} /></span>
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2.5">
 <h3 className="text-[15px] font-semibold text-stone-900">{active ? "Payments active" : s?.connected ? "Finish setting up payments" : "Connect payments"}</h3>
 <Badge tone={active ? "success" : "warning"} dot>{active ? "Active" : s?.connected ? "Action needed" : "Not connected"}</Badge>
 </div>
 <p className="mt-1.5 text-[13px] leading-relaxed text-stone-500">
 {active
 ? "You can accept payments and receive payouts to your bank."
 : s?.connected
 ? "Stripe still needs a few details before you can accept payments."
 : "Set up payments with Stripe — takes a couple of minutes. You’ll add your bank and a few business details."}
 </p>

 {active && (
 <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 text-[13px] text-stone-600">
 <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-600" /> Charges enabled</span>
 <span className="inline-flex items-center gap-1.5"><Landmark size={14} className="text-emerald-600" /> Payouts enabled</span>
 </div>
 )}

 <div className="mt-5">
 {active ? (
 <Button variant="secondary" onClick={connect} disabled={busy}>{busy ? "Opening…" : "Manage on Stripe"}</Button>
 ) : (
 <Button onClick={connect} disabled={busy}>{busy ? "Opening Stripe…" : s?.connected ? "Finish setup" : "Connect with Stripe"}</Button>
 )}
 {err && <p className="mt-3 text-xs text-red-600">{err}</p>}
 </div>
 </div>
 </div>
 </Card>
 )}

 <p className="mt-4 text-xs text-stone-400">Payments are processed securely by Stripe.</p>
 </div>
 );
}
