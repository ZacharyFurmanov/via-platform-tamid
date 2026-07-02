import { fetchComps, isCompsConfigured, type Comp } from "./comps";
import { inferCategoryFromTitle } from "./loadStoreProducts";
import { getInternalPriceBenchmark, type InternalPriceBenchmark } from "./data-layer/price-benchmark-db";

// The price engine: turn real comps into one defensible number.
//  market value  = comps, filtered to TRUE comparables by the model (sold > asking)
//  floor         = cost × (1 + the store's min markup)
//  suggested     = max(market, floor)
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

export type PriceEstimate = {
 suggestedCents: number;
 marketCents: number | null;
 floorCents: number | null;
 lowCents: number | null;
 highCents: number | null;
 confidence: number;
 comps: Comp[]; // the comps actually used
 rationale: string;
 source: "comps" | "floor" | "knowledge" | "benchmark" | "none";
};

function median(nums: number[]): number | null {
 if (!nums.length) return null;
 const s = [...nums].sort((a, b) => a - b);
 const m = Math.floor(s.length / 2);
 return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Ask the model to keep only true comparables and return a defensible market value.
// Falls back to a deterministic sold-median if the model isn't available. Exported
// for testing the valuation independently of the live comp fetch.
export async function valueFromComps(
 query: string,
 photoUrl: string | undefined,
 comps: Comp[],
 ctx?: { brand?: string | null; era?: string | null; runway?: string | null; knowledgeHintCents?: number | null; trend?: string | null; internalBenchmark?: InternalPriceBenchmark | null },
) {
 const fallback = () => {
 const sold = comps.filter((c) => c.sold).map((c) => c.priceCents);
 const base = sold.length >= 3 ? sold : comps.map((c) => c.priceCents);
 const m = median(base);
 // A bare comp median lowballs rare/archival pieces badly (the set is polluted by
 // fast-fashion). When we have an expert knowledge estimate, trust it over the median.
 const k = ctx?.knowledgeHintCents && ctx.knowledgeHintCents > 0 ? ctx.knowledgeHintCents : null;
 const market = k && (!m || k > m) ? k : m;
 const useK = market === k && k != null;
 return {
 marketCents: market,
 low: market ? Math.round(market * 0.85) : null,
 high: market ? Math.round(market * 1.2) : null,
 confidence: useK ? 0.35 : sold.length >= 3 ? 0.6 : 0.4,
 kept: comps.slice(0, 8),
 rationale: useK ? "Estimated from expert knowledge of this piece (no true marketplace comps)." : "Median of comparable resale prices.",
 };
 };
 const apiKey = process.env.ANTHROPIC_API_KEY;
 if (!apiKey || !comps.length) return fallback();

 const idLine = ctx && (ctx.brand || ctx.era || ctx.runway)
 ? `\n\nThis piece has been identified as: ${[ctx.brand, ctx.era].filter(Boolean).join(", ")}${ctx.runway ? ` — from the ${ctx.runway} runway collection (archival/collectible)` : ""}.`
 : "";
 const b = ctx?.internalBenchmark;
 const benchLine = b
 ? `\n\nMOST RELIABLE SIGNAL — THIS platform's own realized sales: "${b.segment}" has recently SOLD here for a median of $${Math.round(b.medianCents / 100)}${b.p25Cents != null && b.p75Cents != null ? ` (typical range $${Math.round(b.p25Cents / 100)}–$${Math.round(b.p75Cents / 100)})` : ""}, across ${b.txnCount} real sales on ${b.storeCount}+ stores. These are actual sales on the exact marketplace this item will list on — weight them ABOVE external asking prices and keep marketCents near this range unless this specific piece is clearly a different caliber or condition.`
 : "";
 const list = comps.map((c, i) => `${i}. [${c.sold ? "SOLD" : "asking"}] $${(c.priceCents / 100).toFixed(0)} — ${c.title.slice(0, 90)} (${c.source})`).join("\n");
 const prompt = `Item being priced: "${query}".${idLine}${benchLine}\n\nCandidate resale comps found online:\n${list}\n\nReturn ONLY JSON: {"marketCents": int, "lowCents": int, "highCents": int, "confidence": 0..1, "keptIndices": int[], "rationale": string}.\nRules:\n- Keep ONLY TRUE comparables: the SAME designer at a similar caliber, a similar garment and era, roughly the photographed condition. Discard fast-fashion, unrelated/diffusion brands, different garments, parts/accessories, wild outliers — never use them as an anchor, ceiling, or floor.\n- ANCHOR TO THE REAL COMPS. When 2+ true comparables exist, marketCents MUST sit within their realistic range — around the typical/median, NOT the single highest one. A boutique-vintage or SOLD price (e.g. a real shop's listing) reflects true market; do not price far above it.\n- ASKING vs SOLD: authenticated-luxury ASKING prices (The RealReal, Vestiaire, 1stDibs, Farfetch, The Luxury Closet) are ASPIRATIONAL and often sit unsold — treat them as a CEILING reference, NOT the target, and NEVER anchor marketCents to the highest asking. Weight actual SOLD prices and realistic shop/marketplace listings most. eBay/Depop/Poshmark are the quick-sale floor.\n- ONLY IF there are essentially NO true comps (truly rare/archival, nothing comparable) may you price from expert knowledge of where this exact piece sells — realistic, not aspirational; don't lowball to fast-fashion, but don't invent a luxury wish-price either. Set confidence ≈0.4.\n- DEMAND / TREND: a sought-after designer/era earns only a MODEST premium — at most ~10-15%, and only when the comps support it. A demand-momentum percentage is NOT a price-increase percentage: NEVER multiply the price by it.${ctx?.trend ? ` Demand note: ${ctx.trend} — apply at most a small nudge, not a large one.` : ""}\n- marketCents = the realistic price this actually SELLS for (what a smart reseller lists to move it), NOT a wish price; lowCents = quick-sale, highCents = a patient strong-demand ceiling; keptIndices = the true comps relied on; rationale = one brief sentence.`;
 const content: any[] = [];
 if (photoUrl) content.push({ type: "image", source: { type: "url", url: photoUrl } });
 content.push({ type: "text", text: prompt });

 try {
 // Retry once on a transient failure (429/5xx) — a rate-limited valuation call must
 // not silently collapse the price to a junk-comp median.
 let res: Response | null = null;
 for (let attempt = 0; attempt < 2; attempt++) {
 res = await fetch(ANTHROPIC_URL, {
 method: "POST",
 headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
 body: JSON.stringify({ model: MODEL, max_tokens: 700, messages: [{ role: "user", content }] }),
 });
 if (res.ok) break;
 if (res.status !== 429 && res.status < 500) break; // non-retryable
 await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
 }
 if (!res || !res.ok) return fallback();
 const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
 const t = data.content?.find((c) => c.type === "text")?.text ?? "";
 const m = t.match(/\{[\s\S]*\}/);
 const raw: any = m ? JSON.parse(m[0]) : {};
 const keptIdx: number[] = Array.isArray(raw.keptIndices) ? raw.keptIndices.filter((n: any) => Number.isInteger(n) && comps[n]) : [];
 const kept = keptIdx.length ? keptIdx.map((i: number) => comps[i]) : comps.slice(0, 8);
 return {
 marketCents: typeof raw.marketCents === "number" && raw.marketCents > 0 ? Math.round(raw.marketCents) : fallback().marketCents,
 low: typeof raw.lowCents === "number" ? Math.round(raw.lowCents) : null,
 high: typeof raw.highCents === "number" ? Math.round(raw.highCents) : null,
 confidence: typeof raw.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : 0.5,
 kept,
 rationale: typeof raw.rationale === "string" ? raw.rationale : "Based on comparable resale prices.",
 };
 } catch {
 return fallback();
 }
}

export async function estimatePrice(opts: {
 query: string;
 photoUrl?: string;
 costCents?: number | null;
 minMarkupBps: number;
 knowledgeHintCents?: number | null;
 extraComps?: Comp[]; // reverse-image (visually-identical) matches — the strongest comps
 context?: { brand?: string | null; era?: string | null; runway?: string | null; trend?: string | null }; // the identified piece + live demand signal, for knowledge/trend-aware valuation
}): Promise<PriceEstimate> {
 // Fetch external comps and THIS platform's own realized-price benchmark together. The
 // internal benchmark (privacy-gated, from the nightly market_metrics) is the strongest
 // signal — actual sales on our marketplace for this brand/category.
 const category = inferCategoryFromTitle(opts.query) as string;
 const [fetched, benchmark] = await Promise.all([
 fetchComps(opts.query).catch(() => []),
 getInternalPriceBenchmark({ brand: opts.context?.brand, category }).catch(() => null),
 ]);
 // Reverse-image matches first (they're the exact piece), then searched comps. Dedupe,
 // keep authenticated-luxury sources ahead of fast-sale marketplaces, and cap the set.
 const PREMIUM = /real\s?real|vestiaire|fashionphile|rebag|luxury\s?closet|1st\s?dibs|farfetch/i;
 const seen = new Set<string>();
 const comps = [...(opts.extraComps || []), ...fetched]
 .filter((c) => { const k = c.link || `${c.title}|${c.priceCents}`; if (seen.has(k)) return false; seen.add(k); return true; })
 .sort((a, b) => (PREMIUM.test(b.source) ? 1 : 0) - (PREMIUM.test(a.source) ? 1 : 0))
 .slice(0, 40);
 let marketCents: number | null = null, low: number | null = null, high: number | null = null, confidence = 0, rationale = "", kept: Comp[] = [];

 if (comps.length) {
 const v = await valueFromComps(opts.query, opts.photoUrl, comps, { ...opts.context, knowledgeHintCents: opts.knowledgeHintCents, internalBenchmark: benchmark });
 marketCents = v.marketCents; low = v.low; high = v.high; confidence = v.confidence; rationale = v.rationale; kept = v.kept;
 } else if (benchmark) {
 // No external comps — anchor to our own realized sold prices for this brand/category.
 marketCents = benchmark.medianCents;
 low = benchmark.p25Cents;
 high = benchmark.p75Cents;
 confidence = 0.5;
 rationale = `Based on ${benchmark.segment}'s recent sold prices on VYA — median across ${benchmark.txnCount} sales on ${benchmark.storeCount}+ stores.`;
 } else if (opts.knowledgeHintCents && opts.knowledgeHintCents > 0) {
 marketCents = opts.knowledgeHintCents;
 confidence = 0.3;
 rationale = "Estimated from model knowledge (live comps not enabled).";
 }

 const floorCents = opts.costCents && opts.costCents > 0 ? Math.round(opts.costCents * (1 + opts.minMarkupBps / 10000)) : null;
 const suggestedCents = Math.max(marketCents ?? 0, floorCents ?? 0);

 let source: PriceEstimate["source"] = "none";
 if (suggestedCents > 0) {
 if (floorCents && suggestedCents === floorCents && (marketCents == null || floorCents >= marketCents)) source = "floor";
 else if (comps.length) source = "comps";
 else if (benchmark && marketCents === benchmark.medianCents) source = "benchmark";
 else source = "knowledge";
 }

 return { suggestedCents, marketCents, floorCents, lowCents: low, highCents: high, confidence, comps: kept, rationale, source };
}

export { isCompsConfigured };
