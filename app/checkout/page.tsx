"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

type LineItem = { id: string; title: string; priceCents: number; currency: string; image: string | null };
type Info = { items: LineItem[]; storeName: string; freeShipping: boolean; subtotalCents: number };
type RateOpt = { provider: string; service: string; costCents: number; estDays: number | null };

const input = "w-full bg-white border border-[#5D0F17]/15 px-3 py-2.5 text-sm text-[#5D0F17] outline-none focus:border-[#5D0F17]/50 transition";
const appearance = { theme: "flat" as const, variables: { colorPrimary: "#5D0F17", colorText: "#5D0F17", colorBackground: "#ffffff", fontFamily: "ui-sans-serif, system-ui, sans-serif", borderRadius: "2px", fontSizeBase: "14px" } };

export default function CheckoutPage() {
 return (
 <Suspense fallback={<main className="min-h-screen bg-[#FFFDF8]" />}>
 <CheckoutInner />
 </Suspense>
 );
}

function CheckoutInner() {
 const sp = useSearchParams();
 const itemId = sp.get("item") || "";
 const isCart = sp.get("cart") === "1";
 const [info, setInfo] = useState<Info | null>(null);
 const [loadErr, setLoadErr] = useState<string | null>(null);
 const [email, setEmail] = useState("");
 const [a, setA] = useState({ name: "", line1: "", line2: "", city: "", state: "", zip: "", country: "US", phone: "" });
 const [rates, setRates] = useState<RateOpt[] | null>(null);
 const [picked, setPicked] = useState(0);
 const [busy, setBusy] = useState(false);
 const [err, setErr] = useState<string | null>(null);
 // Embedded payment (cart): once we have a PaymentIntent, mount the Payment Element.
 const [clientSecret, setClientSecret] = useState<string | null>(null);
 const [stripeP, setStripeP] = useState<Promise<Stripe | null> | null>(null);
 const [payTotal, setPayTotal] = useState(0);

 useEffect(() => {
 if (!itemId && !isCart) return;
 let cancelled = false;
 (async () => {
 try {
 const r = await fetch(isCart ? `/api/storefront/cart-checkout-info` : `/api/storefront/checkout-info?item=${itemId}`);
 const d = await r.json();
 if (cancelled) return;
 if (!r.ok) { setLoadErr(d.error || "Couldn’t load this checkout."); return; }
 setInfo(isCart ? d : { items: [d.item], storeName: d.storeName, freeShipping: d.freeShipping, subtotalCents: d.item.priceCents });
 } catch {
 if (!cancelled) setLoadErr("Couldn’t load this checkout.");
 }
 })();
 return () => { cancelled = true; };
 }, [itemId, isCart]);

 const cur = info?.items[0]?.currency || "USD";
 const money = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format((c || 0) / 100);
 const setF = (k: keyof typeof a, v: string) => { setA((s) => ({ ...s, [k]: v })); setRates(null); setClientSecret(null); };
 const addrValid = a.line1 && a.city && a.state && a.zip && email.includes("@");

 async function onContinue() {
 if (!info) return;
 setErr(null);
 if (!addrValid) { setErr("Enter your email and full shipping address."); return; }
 if (info.freeShipping) { proceed(0); return; }
 setBusy(true);
 try {
 const toAddress = { name: a.name, street1: a.line1, street2: a.line2, city: a.city, state: a.state, zip: a.zip, country: a.country, phone: a.phone };
 const r = await fetch(isCart ? "/api/storefront/cart-shipping" : "/api/storefront/shipping-rates", {
 method: "POST", headers: { "Content-Type": "application/json" },
 body: JSON.stringify(isCart ? { toAddress } : { itemId, toAddress }),
 });
 const d = await r.json();
 if (!r.ok) { setErr(d.error || "Couldn’t get shipping rates."); setBusy(false); return; }
 if (d.free || !d.rates?.length) { setBusy(false); proceed(0); return; }
 setRates(d.rates); setPicked(0);
 } catch { setErr("Couldn’t get shipping rates."); }
 setBusy(false);
 }

 // Cart → embedded Payment Element; single item → redirect to Stripe Checkout.
 async function proceed(shippingCostCents: number) {
 if (isCart) return startEmbeddedPayment(shippingCostCents);
 return redirectPay(shippingCostCents);
 }

 async function startEmbeddedPayment(shippingCostCents: number) {
 setBusy(true); setErr(null);
 try {
 const buyer = { email, name: a.name, phone: a.phone };
 const ship = { line1: a.line1, line2: a.line2, city: a.city, state: a.state, zip: a.zip, country: a.country };
 const r = await fetch("/api/storefront/cart-intent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ buyer, ship, shippingCostCents }) });
 const d = await r.json();
 if (!r.ok || !d.clientSecret) { setErr(d.error || "Couldn’t start payment."); setBusy(false); return; }
 setPayTotal(d.amountCents);
 setStripeP(loadStripe(d.publishableKey, { stripeAccount: d.stripeAccount }));
 setClientSecret(d.clientSecret);
 } catch { setErr("Couldn’t start payment."); }
 setBusy(false);
 }

 async function redirectPay(shippingCostCents: number) {
 setBusy(true); setErr(null);
 try {
 const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, buyer: { email, name: a.name, phone: a.phone }, ship: { line1: a.line1, line2: a.line2, city: a.city, state: a.state, zip: a.zip, country: a.country }, shippingCostCents }) });
 const d = await r.json();
 if (!r.ok || !d.url) { setErr(d.error || "Checkout failed."); setBusy(false); return; }
 window.location.href = d.url;
 } catch { setErr("Checkout failed."); setBusy(false); }
 }

 if (loadErr) return <main className="min-h-screen bg-[#FFFDF8] text-[#5D0F17] flex items-center justify-center"><p className="text-sm text-[#5D0F17]/60">{loadErr}</p></main>;
 if (!info) return <main className="min-h-screen bg-[#FFFDF8] text-[#5D0F17] flex items-center justify-center"><p className="text-sm text-[#5D0F17]/50">Loading…</p></main>;

 const shipCost = rates ? rates[picked]?.costCents || 0 : 0;
 const total = clientSecret ? payTotal : info.subtotalCents + (rates ? shipCost : 0);

 return (
 <main className="min-h-screen bg-[#FFFDF8] text-[#5D0F17]">
 <div className="mx-auto max-w-md px-6 py-12">
 <h1 className="font-serif text-2xl mb-1">Checkout</h1>
 <p className="text-xs text-[#5D0F17]/50 mb-6">from {info.storeName}</p>

 {/* Order summary */}
 <div className="border border-[#5D0F17]/12 bg-white mb-6 divide-y divide-[#5D0F17]/10">
 {info.items.map((it) => (
 <div key={it.id} className="flex gap-3 items-center p-3">
 <div className="h-16 w-16 shrink-0 overflow-hidden bg-[#efe6d7]">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 {it.image && <img src={it.image} alt="" className="h-full w-full object-cover" />}
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-sm truncate">{it.title}</p>
 <p className="text-sm font-medium">{money(it.priceCents)}</p>
 </div>
 </div>
 ))}
 </div>

 {clientSecret && stripeP ? (
 /* Payment step — embedded Apple Pay / Google Pay / card */
 <>
 <div className="mb-4 text-sm">
 <div className="flex justify-between py-1"><span className="text-[#5D0F17]/60">Subtotal</span><span>{money(info.subtotalCents)}</span></div>
 <div className="flex justify-between py-1"><span className="text-[#5D0F17]/60">Shipping</span><span>{money(payTotal - info.subtotalCents)}</span></div>
 <div className="flex justify-between py-2 border-t border-[#5D0F17]/10 font-semibold"><span>Total</span><span>{money(total)}</span></div>
 </div>
 <Elements stripe={stripeP} options={{ clientSecret, appearance }}>
 <PayForm total={total} money={money} />
 </Elements>
 <button onClick={() => { setClientSecret(null); }} className="mt-3 w-full text-center text-[11px] text-[#5D0F17]/50 underline">← Back to shipping</button>
 </>
 ) : (
 <>
 {/* Buyer + address */}
 <div className="space-y-2 mb-5">
 <input className={input} value={email} onChange={(e) => { setEmail(e.target.value); setRates(null); }} placeholder="Email (for your receipt)" inputMode="email" />
 <input className={input} value={a.name} onChange={(e) => setF("name", e.target.value)} placeholder="Full name" />
 <input className={input} value={a.line1} onChange={(e) => setF("line1", e.target.value)} placeholder="Street address" />
 <input className={input} value={a.line2} onChange={(e) => setF("line2", e.target.value)} placeholder="Apt, suite (optional)" />
 <div className="grid grid-cols-3 gap-2">
 <input className={input} value={a.city} onChange={(e) => setF("city", e.target.value)} placeholder="City" />
 <input className={input} value={a.state} onChange={(e) => setF("state", e.target.value)} placeholder="State" />
 <input className={input} value={a.zip} onChange={(e) => setF("zip", e.target.value)} placeholder="ZIP" />
 </div>
 <input className={input} value={a.phone} onChange={(e) => setF("phone", e.target.value)} placeholder="Phone (optional)" inputMode="tel" />
 </div>

 {/* Shipping rates */}
 {rates && (
 <div className="mb-5">
 <p className="text-[11px] uppercase tracking-[0.16em] text-[#5D0F17]/55 mb-2">Shipping</p>
 <div className="space-y-2">
 {rates.map((r, i) => (
 <label key={i} className={`flex items-center gap-3 border p-3 cursor-pointer transition ${picked === i ? "border-[#5D0F17] bg-[#5D0F17]/[0.03]" : "border-[#5D0F17]/15"}`}>
 <input type="radio" checked={picked === i} onChange={() => setPicked(i)} />
 <span className="flex-1 text-sm">{r.provider} {r.service}{r.estDays ? ` · ~${r.estDays}d` : ""}</span>
 <span className="text-sm font-medium">{money(r.costCents)}</span>
 </label>
 ))}
 </div>
 </div>
 )}

 {info.freeShipping && <p className="mb-4 text-sm text-green-700">✓ Free shipping</p>}

 {rates ? (
 <>
 <div className="flex justify-between text-sm py-1"><span className="text-[#5D0F17]/60">Subtotal</span><span>{money(info.subtotalCents)}</span></div>
 <div className="flex justify-between text-sm py-1"><span className="text-[#5D0F17]/60">Shipping</span><span>{money(shipCost)}</span></div>
 <div className="flex justify-between text-sm py-2 border-t border-[#5D0F17]/10 mb-4 font-semibold"><span>Total</span><span>{money(total)}</span></div>
 <button onClick={() => proceed(shipCost)} disabled={busy} className="w-full bg-[#5D0F17] text-[#FFFDF8] px-6 py-3.5 text-xs uppercase tracking-[0.15em] hover:bg-[#5D0F17]/85 transition disabled:opacity-50">{busy ? "…" : isCart ? "Continue to payment →" : `Pay ${money(total)} →`}</button>
 </>
 ) : (
 <button onClick={onContinue} disabled={busy} className="w-full bg-[#5D0F17] text-[#FFFDF8] px-6 py-3.5 text-xs uppercase tracking-[0.15em] hover:bg-[#5D0F17]/85 transition disabled:opacity-50">{busy ? "…" : info.freeShipping ? (isCart ? "Continue to payment →" : `Pay ${money(info.subtotalCents)} →`) : "Continue to shipping →"}</button>
 )}
 {err && <p className="mt-3 text-xs text-red-700">{err}</p>}
 </>
 )}
 <p className="mt-4 text-center text-[11px] text-[#5D0F17]/40">Payment is processed securely by Stripe.</p>
 </div>
 </main>
 );
}

// The embedded payment form: Apple Pay / Google Pay / card via Stripe's Payment Element.
function PayForm({ total, money }: { total: number; money: (c: number) => string }) {
 const stripe = useStripe();
 const elements = useElements();
 const [busy, setBusy] = useState(false);
 const [err, setErr] = useState<string | null>(null);

 async function submit(e: React.FormEvent) {
 e.preventDefault();
 if (!stripe || !elements) return;
 setBusy(true); setErr(null);
 const { error } = await stripe.confirmPayment({ elements, confirmParams: { return_url: `${window.location.origin}/checkout/success` } });
 if (error) { setErr(error.message || "Payment failed."); setBusy(false); }
 }

 return (
 <form onSubmit={submit}>
 <PaymentElement options={{ layout: "tabs" }} />
 <button type="submit" disabled={!stripe || busy} className="mt-4 w-full bg-[#5D0F17] text-[#FFFDF8] px-6 py-3.5 text-xs uppercase tracking-[0.15em] hover:bg-[#5D0F17]/85 transition disabled:opacity-50">{busy ? "Processing…" : `Pay ${money(total)} →`}</button>
 {err && <p className="mt-3 text-xs text-red-700">{err}</p>}
 </form>
 );
}
