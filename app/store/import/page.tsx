"use client";

import { useState } from "react";
import { Card, PageHeader, Button, inputCls } from "../ui";
import { useStoreBase } from "../nav-base";

// "Bring your site over" — capture the seller's existing site (every page,
// pixel-for-pixel) and host it on VYA, then swap in VYA's commerce backend.
// Sellers with NO existing site build one from the Storefront builder instead.
export default function BringYourSitePage() {
 const base = useStoreBase();
 const [capUrl, setCapUrl] = useState("");
 const [capBusy, setCapBusy] = useState(false);
 const [capErr, setCapErr] = useState<string | null>(null);
 const [capResult, setCapResult] = useState<{ pages: number; url: string } | null>(null);

 async function bringSiteOver() {
 if (!capUrl.trim()) return;
 setCapBusy(true); setCapErr(null); setCapResult(null);
 try {
 const r = await fetch("/api/store/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: capUrl }) });
 const d = await r.json();
 if (!r.ok) setCapErr(d.error || "Couldn’t bring that site over.");
 else setCapResult({ pages: d.pages, url: d.url });
 } catch { setCapErr("Couldn’t bring that site over."); }
 setCapBusy(false);
 }

 return (
 <div className="mx-auto max-w-2xl px-6 py-10 sm:px-8">
 <PageHeader title="Bring your site over" subtitle="We host your exact site — every page, pixel-for-pixel — on VYA, then switch the backend to VYA commerce. Keep your design; swap Shopify." />

 {capResult ? (
 <Card className="border-emerald-200 bg-emerald-50/40 p-6">
 <p className="text-[15px] font-semibold text-emerald-800">Your site is live on VYA</p>
 <p className="mt-1 text-[13px] text-stone-600"><b>{capResult.pages}</b> pages captured.</p>
 <div className="mt-4 flex flex-wrap gap-2">
 <Button onClick={() => { window.open(capResult.url, "_blank"); }}>View your site ↗</Button>
 <Button variant="secondary" onClick={() => { setCapResult(null); setCapUrl(""); }}>Bring another</Button>
 </div>
 </Card>
 ) : (
 <Card className="p-6">
 <div className="flex gap-2">
 <input className={inputCls} value={capUrl} onChange={(e) => setCapUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && bringSiteOver()} placeholder="yourstore.com" />
 <Button className="shrink-0" onClick={bringSiteOver} disabled={capBusy || !capUrl.trim()}>{capBusy ? "Bringing it over…" : "Bring my site over"}</Button>
 </div>
 {capBusy && <p className="mt-2.5 text-[12px] text-stone-500">Crawling + hosting every page — this takes a minute or two.</p>}
 {capErr && <p className="mt-2.5 text-xs text-red-600">{capErr}</p>}
 </Card>
 )}

 <p className="mt-4 text-xs text-stone-400">No site yet? Build one from <a href={`${base}/storefront`} className="text-stone-600 underline hover:text-stone-900">Storefront</a>.</p>
 </div>
 );
}
