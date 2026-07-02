"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Result = { pages: number; items: number; url: string };

export default function OnboardingPage() {
 const router = useRouter();
 const [ready, setReady] = useState(false);
 const [storeName, setStoreName] = useState("");
 const [url, setUrl] = useState("");
 const [busy, setBusy] = useState(false);
 const [err, setErr] = useState<string | null>(null);
 const [result, setResult] = useState<Result | null>(null);

 // Already set up? Skip straight to the dashboard.
 useEffect(() => {
 (async () => {
 try {
 const r = await fetch("/api/store/onboarding-status");
 if (r.ok) {
 const d = await r.json();
 setStoreName(d.storeName || "");
 if (d.onboarded) {
 router.replace("/store/home");
 return;
 }
 }
 } catch {
 /* show onboarding anyway */
 }
 setReady(true);
 })();
 }, [router]);

 async function run() {
 if (!url.trim()) return;
 setBusy(true);
 setErr(null);
 try {
 const r = await fetch("/api/store/capture", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ url }),
 });
 const d = await r.json();
 if (!r.ok) setErr(d.error || "Couldn’t bring that site over.");
 else setResult({ pages: d.pages, items: d.items ?? 0, url: d.url });
 } catch {
 setErr("Couldn’t bring that site over.");
 }
 setBusy(false);
 }

 const input =
 "w-full bg-white border border-[#5D0F17]/15 px-3.5 py-3 text-sm text-[#5D0F17] outline-none focus:border-[#5D0F17]/50 transition";

 if (!ready) {
 return <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center text-[#5D0F17]/40 text-sm">Loading…</div>;
 }

 return (
 <main className="min-h-screen bg-[#FFFDF8] text-[#5D0F17] flex items-center">
 <div className="mx-auto w-full max-w-xl px-6 py-14">
 <p className="text-[10px] uppercase tracking-[0.25em] text-[#5D0F17]/45 mb-2">
 Welcome{storeName ? `, ${storeName}` : ""}
 </p>
 <h1 className="font-serif text-3xl sm:text-4xl mb-3">Let’s bring your store over.</h1>
 <p className="text-sm text-[#5D0F17]/55 mb-8">
 Paste your existing site and VYA hosts it — every page, exactly as it looks — then switches the backend
 to VYA commerce. One step, then you’re live. (No site yet? Start from scratch below.)
 </p>

 {result ? (
 <div className="border border-green-700/25 bg-green-700/5 p-6">
 <p className="font-serif text-xl text-green-800 mb-1">Your site is live on VYA.</p>
 <p className="text-sm text-[#5D0F17]/60"><b>{result.pages}</b> {result.pages === 1 ? "page" : "pages"} captured{result.items ? ` · ${result.items} ${result.items === 1 ? "product" : "products"} imported` : ""}.</p>
 <div className="mt-5 flex flex-wrap gap-3">
  <a href={result.url} target="_blank" rel="noopener noreferrer" className="bg-[#5D0F17] text-[#FFFDF8] px-5 py-2.5 text-xs uppercase tracking-[0.15em] hover:bg-[#5D0F17]/85 transition">View your site ↗</a>
 <button onClick={() => router.push("/store/home")} className="px-5 py-2.5 text-xs uppercase tracking-[0.15em] text-[#5D0F17]/55 hover:text-[#5D0F17] transition">
 Go to dashboard
 </button>
 </div>
 </div>
 ) : (
 <>
 <input
 className={input}
 value={url}
 onChange={(e) => setUrl(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && run()}
 placeholder="yourstore.com — Shopify or Squarespace"
 autoFocus
 />
 <button
 onClick={run}
 disabled={busy || !url.trim()}
 className="mt-5 bg-[#5D0F17] text-[#FFFDF8] px-6 py-3 text-xs uppercase tracking-[0.15em] hover:bg-[#5D0F17]/85 transition disabled:opacity-50"
 >
 {busy ? "Bringing your site over…" : "Bring my site over →"}
 </button>
 {err && <p className="mt-3 text-xs text-red-700">{err}</p>}

 <div className="mt-8 flex gap-5 text-xs text-[#5D0F17]/45">
 <a href="/store/storefront" className="underline hover:text-[#5D0F17]">Start from scratch instead</a>
 <button onClick={() => router.push("/store/home")} className="underline hover:text-[#5D0F17]">Skip for now</button>
 </div>
 </>
 )}
 </div>
 </main>
 );
}
