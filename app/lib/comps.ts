// Real resale comps via SerpApi — eBay *sold* listings (actual transaction prices,
// the gold standard) plus Google Shopping (broad market). Gated behind the key AND
// an explicit enable flag, so it's fully dormant — no calls, no spend — until you
// subscribe and flip PHOTOROOM-style SERPAPI_ENABLED=true.

import { unstable_cache } from "next/cache";

const SERPAPI_URL = "https://serpapi.com/search.json";

export type Comp = { title: string; priceCents: number; currency: string; sold: boolean; source: string; link?: string; condition?: string };

export function isCompsConfigured(): boolean {
 return Boolean(process.env.SERPAPI_API_KEY) && process.env.SERPAPI_ENABLED === "true";
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function serp(params: Record<string, string>): Promise<any | null> {
 const apiKey = process.env.SERPAPI_API_KEY;
 if (!apiKey) return null;
 const url = new URL(SERPAPI_URL);
 url.searchParams.set("api_key", apiKey);
 for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
 try {
 const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
 if (!res.ok) return null;
 return await res.json();
 } catch {
 return null;
 }
}

/** Coerce SerpApi's many price shapes (number | {extracted_value} | {raw} | {from}) into cents. */
export function priceToCents(p: any): number | null {
 let v: number | null = null;
 if (typeof p === "number") v = p;
 else if (typeof p?.extracted_value === "number") v = p.extracted_value;
 else if (typeof p?.from?.extracted_value === "number") v = p.from.extracted_value;
 else if (typeof p === "string") { const n = parseFloat(p.replace(/[^0-9.]/g, "")); v = Number.isFinite(n) ? n : null; }
 return v && v > 0 ? Math.round(v * 100) : null;
}

export type VisualMatch = { title: string; priceCents: number | null; source: string; link?: string };

/** Reverse-image search (Google Lens) for the exact / visually-identical product.
 *  This is the single best signal for BRAND ID and true price — it finds the same
 *  piece listed across the web instead of guessing from the look. [] if not enabled. */
export async function reverseImageMatches(imageUrl: string): Promise<VisualMatch[]> {
 if (!isCompsConfigured() || !imageUrl) return [];
 const r = await serp({ engine: "google_lens", url: imageUrl, country: "us" });
 const matches = (r?.visual_matches || []) as any[];
 return matches
 .slice(0, 25)
 .map((m) => ({ title: String(m.title || ""), priceCents: priceToCents(m.price), source: String(m.source || ""), link: m.link as string | undefined }))
 .filter((m) => m.title);
}

/** Reverse-image matches that carry a price → resale comps. Visually-identical items
 *  are the truest comps there are, so these anchor the valuation. */
export function matchesToComps(matches: VisualMatch[]): Comp[] {
 return matches
 .filter((m) => m.priceCents && m.priceCents > 0)
 .map((m) => ({ title: m.title, priceCents: m.priceCents as number, currency: "USD", sold: false, source: m.source || "Visual match", link: m.link }));
}

/** Pull a basket of real comps for a query. Returns [] if comps aren't enabled. */
export async function fetchComps(query: string): Promise<Comp[]> {
 if (!isCompsConfigured() || !query.trim()) return [];
 const [ebayR, shopR, realRealR] = await Promise.allSettled([
 // eBay SOLD + completed — real transaction prices.
 serp({ engine: "ebay", _nkw: query, ebay_domain: "ebay.com", LH_Sold: "1", LH_Complete: "1" }),
 serp({ engine: "google_shopping", q: query, gl: "us" }),
 // Dedicated The RealReal pass — authenticated luxury comps, even for lesser-known
 // brands that eBay/Depop underprice. We keep only RealReal-sourced rows from this.
 serp({ engine: "google_shopping", q: `${query} the real real`, gl: "us" }),
 ]);

 const comps: Comp[] = [];
 if (ebayR.status === "fulfilled" && ebayR.value) {
 for (const r of (ebayR.value.organic_results || []).slice(0, 25)) {
 const cents = priceToCents(r.price);
 if (cents) comps.push({ title: String(r.title || ""), priceCents: cents, currency: "USD", sold: true, source: "eBay (sold)", link: r.link, condition: r.condition });
 }
 }
 if (shopR.status === "fulfilled" && shopR.value) {
 for (const r of (shopR.value.shopping_results || []).slice(0, 30)) {
 const cents = priceToCents(r.extracted_price ?? r.price);
 if (cents) comps.push({ title: String(r.title || ""), priceCents: cents, currency: "USD", sold: false, source: String(r.source || "Google Shopping"), link: r.link });
 }
 }
 if (realRealR.status === "fulfilled" && realRealR.value) {
 for (const r of (realRealR.value.shopping_results || []).slice(0, 20)) {
 if (!/real\s?real/i.test(String(r.source || ""))) continue; // RealReal rows only
 const cents = priceToCents(r.extracted_price ?? r.price);
 if (cents) comps.push({ title: String(r.title || ""), priceCents: cents, currency: "USD", sold: false, source: "The RealReal", link: r.link });
 }
 }

 // Dedupe (the RealReal pass can repeat rows from the general shopping pass).
 const seen = new Set<string>();
 const unique = comps.filter((c) => { const k = c.link || `${c.title}|${c.priceCents}`; if (seen.has(k)) return false; seen.add(k); return true; });

 // Surface authenticated-luxury resellers (The RealReal, Vestiaire, Fashionphile)
 // first — they're the truest comps for designer pieces and must survive any
 // downstream truncation before the valuation step sees them.
 const PREMIUM = /real\s?real|vestiaire|fashionphile|rebag|luxury\s?closet|1st\s?dibs|farfetch/i;
 unique.sort((a, b) => (PREMIUM.test(b.source) ? 1 : 0) - (PREMIUM.test(a.source) ? 1 : 0));
 return unique;
}

export type ResaleTrend = { momentumPct: number; trending: boolean; note: string; source: string };

/** Broad resale-world demand trend for a brand/item via Google Trends (SerpApi).
 *  Google search interest is the best cross-market proxy for real resale demand — it
 *  spans the whole secondhand world (what shoppers are hunting for across every site),
 *  not VYA's thin pilot traffic. Compares recent vs prior interest over ~3 months.
 *  Returns null when comps aren't enabled or there isn't enough signal. */
async function _fetchResaleTrendUncached(query: string): Promise<ResaleTrend | null> {
 if (!isCompsConfigured() || !query.trim()) return null;
 const r = await serp({ engine: "google_trends", q: query.trim(), data_type: "TIMESERIES", date: "today 3-m" });
 const timeline = (r?.interest_over_time?.timeline_data ?? []) as any[];
 const vals = timeline
 .map((t) => Number(t?.values?.[0]?.extracted_value ?? t?.values?.[0]?.value ?? NaN))
 .filter((n) => Number.isFinite(n));
 if (vals.length < 8) return null; // not enough of a series to trust a direction
 const half = Math.floor(vals.length / 2);
 const avg = (a: number[]) => a.reduce((s, n) => s + n, 0) / (a.length || 1);
 const prior = avg(vals.slice(0, half));
 const recent = avg(vals.slice(half));
 if (prior <= 0) return null;
 const momentumPct = Math.round(((recent - prior) / prior) * 100);
 return {
 momentumPct,
 trending: momentumPct >= 10, // a real, sustained uptick — not noise
 note: `${momentumPct >= 0 ? "+" : ""}${momentumPct}% resale search demand vs prior 3mo`,
 source: "Google Trends",
 };
}

// Cache by query (brand+category) for a week: a brand's search-trend momentum barely moves
// week to week and is shared across every listing of that brand — so this collapses the cost
// from one SerpApi call per listing to roughly one call per brand per week.
export const fetchResaleTrend = unstable_cache(_fetchResaleTrendUncached, ["resale-trend"], {
 revalidate: 604800, // 7 days
});
