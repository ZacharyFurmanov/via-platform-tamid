import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { draftListing, isIntakeConfigured, PROMPT_VERSION } from "@/app/lib/ai-intake";
import { ghostMannequinFromUrl, isPhotoroomConfigured } from "@/app/lib/photoroom";
import { getVoice, buildStoreVoice } from "@/app/lib/store-voice";
import { estimatePrice } from "@/app/lib/price-engine";
import { getMinMarkupBps } from "@/app/lib/store-pricing-db";
import { getIntakeHints, getVisualHints, getStorePriceMultiplier } from "@/app/lib/intake-memory-db";
import { embedImage, isEmbeddingConfigured } from "@/app/lib/embeddings";
import { reverseImageMatches, matchesToComps, isCompsConfigured, fetchResaleTrend, type VisualMatch } from "@/app/lib/comps";
import { inferBrandFromTitle } from "@/app/lib/market-data-db";
import { gate } from "@/app/lib/concurrency";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Cap concurrent AI listing work so bursts (many stores at once) don't trip the
// Anthropic per-minute rate limits. Tunable as the API tier grows.
const AI_GATE = () => gate("intake-ai", Number(process.env.INTAKE_AI_CONCURRENCY) || 3);

// The reverse-image matches are the same piece found across the web, so their titles
// carry the real brand. Run each through the canonical brand matcher and take the
// consensus — deterministic, so we don't depend on the model choosing to trust them.
function brandFromMatches(matches: VisualMatch[]): { brand: string | null; hits: number } {
 const tally = new Map<string, number>();
 for (const m of matches) {
 const b = inferBrandFromTitle(m.title);
 if (b) tally.set(b, (tally.get(b) || 0) + 1);
 }
 let brand: string | null = null, hits = 0;
 for (const [b, n] of tally) if (n > hits) { brand = b; hits = n; }
 return { brand, hits };
}

// Does a match title carry the seller's brand? (normalized, punctuation-insensitive)
function titleHasBrand(title: string, brand: string): boolean {
 const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
 const b = norm(brand);
 return b.length >= 3 && norm(title).includes(b);
}

// Resellers date archival pieces in their titles (e.g. "Prada F/W 1998 leather skirt").
// Mine the SAME-BRAND comp/match titles for the most-cited season+year → runway string.
function extractRunway(brand: string, titles: string[]): string | null {
 if (!brand) return null;
 const tally = new Map<string, number>();
 for (const t of titles) {
 if (!titleHasBrand(t, brand)) continue;
 const year = t.match(/\b(199\d|20[01]\d)\b/)?.[0];
 if (!year) continue;
 const low = t.toLowerCase();
 const season = /(s\/s|\bss\b|spring|resort|cruise)/.test(low) ? "S/S"
 : /(f\/w|a\/w|\bfw\b|\baw\b|fall|autumn|winter)/.test(low) ? "F/W" : "";
 if (!season) continue;
 const key = `${season} ${year}`;
 tally.set(key, (tally.get(key) || 0) + 1);
 }
 let best: string | null = null, n = 0;
 for (const [k, v] of tally) if (v > n) { best = k; n = v; }
 return best ? `${brand} ${best}` : null;
}

// Reverse-image matches → a strong, explicit brand-grounding instruction. These are
// the same piece found across the web, so they beat any visual guess at the brand.
function reverseImageHint(matches: VisualMatch[], brandKnown = false): string {
 const rows = matches.filter((m) => m.title).slice(0, 12);
 if (!rows.length) return "";
 const list = rows.map((m) => `- "${m.title.slice(0, 110)}"${m.source ? ` — ${m.source}` : ""}`).join("\n");
 const head = `\n\nINTERNAL EVIDENCE — reverse-image search of the primary photo returned these visually-matching products from across the web:\n${list}\n\n`;
 const body = brandKnown
 ? `The seller already gave the brand (authoritative — keep it). Use these same-brand matches to pin down the ERA and the specific runway COLLECTION/SEASON: if they consistently indicate a season/year (e.g. "F/W 2004"), set the runway and era fields precisely. Do NOT change the brand.`
 : `These are the STRONGEST evidence of the ACTUAL brand/designer, item type, and era — the same piece found elsewhere. If they consistently point to a brand/designer, use it with high confidence even if your visual instinct differs; if they're clearly irrelevant or contradictory, return brand null rather than forcing one.`;
 const tail = ` THIS IS BACKGROUND DATA FOR YOU ONLY: never mention the reverse-image search, "web matches", or "the photos" in the title or description — silently use it to fill the brand/era/runway fields.`;
 return head + body + tail;
}

// POST { imageUrls, filled? } — fill in the BLANKS of a listing the seller started.
// Manual-first: the seller types what they know; we only run the AI work the gaps
// actually need. Whatever they filled is skipped — crucially, providing a price skips
// the (rate-limit-heavy) valuation call, and a fully-typed listing makes ZERO AI calls.
export async function POST(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 if (!isIntakeConfigured()) {
 return NextResponse.json({ error: "AI intake isn’t enabled on the server yet." }, { status: 503 });
 }

 const body = await request.json().catch(() => null);
 const imageUrls: string[] = Array.isArray(body?.imageUrls)
 ? body.imageUrls.filter((u: unknown) => typeof u === "string" && u).slice(0, 6)
 : (body?.imageUrl ? [String(body.imageUrl)] : []);
 if (imageUrls.length === 0) return NextResponse.json({ error: "imageUrl(s) required" }, { status: 400 });
 const mainUrl = imageUrls[0]; // ghost, embedding + comp photo use the primary shot

 // What the seller already filled in — we only generate the rest.
 const filled: Record<string, unknown> = body?.filled && typeof body.filled === "object" ? body.filled : {};
 const has = (k: string) => typeof filled[k] === "string" && (filled[k] as string).trim().length > 0;
 const val = (k: string) => (has(k) ? (filled[k] as string).trim() : "");

 const DRAFT_FIELDS = ["title", "brand", "era", "material", "condition", "category", "description"];
 const needDraft = DRAFT_FIELDS.some((k) => !has(k)); // any text field blank → run the vision draft
 const needPrice = !has("price"); // price typed → skip the valuation call entirely
 const needReverse = isCompsConfigured() && (needDraft || needPrice); // Lens → brand ID, runway/era, comps

 // Only learn the store voice when we're actually writing copy.
 const voice = needDraft ? ((await getVoice(slug).catch(() => null)) ?? (await buildStoreVoice(slug).catch(() => null))) : null;

 // Embedding (memory) + correction hints + reverse-image — each only when relevant.
 const [embedding, brandHints, matches] = await Promise.all([
 isEmbeddingConfigured() ? embedImage(mainUrl).catch(() => null) : Promise.resolve(null),
 needDraft ? getIntakeHints(slug).catch(() => "") : Promise.resolve(""),
 needReverse ? reverseImageMatches(mainUrl).catch(() => [] as VisualMatch[]) : Promise.resolve([] as VisualMatch[]),
 ]);
 const visualHints = needDraft && embedding ? await getVisualHints(slug, embedding).catch(() => "") : "";
 // If the seller typed the brand, keep only same-brand matches (a look-alike in a
 // different label must not sway the copy) — but still use them to find the runway/era.
 const relevantMatches = has("brand") ? matches.filter((m) => titleHasBrand(m.title, val("brand"))) : matches;
 const hints = reverseImageHint(relevantMatches, has("brand")) + brandHints + visualHints;

 // Vision draft (gated) + ghost cover, in parallel. Skip the draft if nothing's blank.
 // Pass the seller's typed fields so the copy honors them (e.g. won't write
 // "excellent" when they said "good"). Price/cost/parcel aren't writing context.
 const known: Record<string, string> = {};
 for (const k of ["title", "brand", "era", "material", "condition", "size", "category", "description"]) if (has(k)) known[k] = val(k);

 const [draftRes, ghostPng] = await Promise.allSettled([
 needDraft
 ? AI_GATE().run(() => draftListing(imageUrls, voice ? { guide: voice.guide, examples: voice.examples } : undefined, hints, known))
 : Promise.resolve(null),
 isPhotoroomConfigured() ? ghostMannequinFromUrl(mainUrl) : Promise.resolve(null),
 ]);

 if (needDraft && draftRes.status === "rejected") {
 return NextResponse.json({ error: draftRes.reason instanceof Error ? draftRes.reason.message : "Draft failed." }, { status: 502 });
 }
 const draft = draftRes.status === "fulfilled" ? draftRes.value : null;

 let ghostUrl: string | null = null;
 if (ghostPng.status === "fulfilled" && ghostPng.value) {
 try {
 const blob = await put(`intake/${slug}/${Date.now()}-ghost.png`, Buffer.from(ghostPng.value), { access: "public", contentType: "image/png" });
 ghostUrl = blob.url;
 } catch {
 /* ghost is optional — keep the draft */
 }
 }

 // Reverse-image consensus brand wins over the model's uncertainty — but only when the
 // seller didn't supply a brand themselves (their input is authoritative).
 const idBrand = brandFromMatches(matches);
 if (draft && idBrand.brand && !has("brand")) {
 const cur = draft.brand?.value || "";
 const disagrees = !cur || draft.brand.confidence < 0.7 || !cur.toLowerCase().includes(idBrand.brand.toLowerCase());
 if (disagrees) draft.brand = { value: idBrand.brand, confidence: idBrand.hits >= 2 ? 0.85 : 0.6 };
 }
 console.log(`[intake ${slug}] needDraft=${needDraft} needPrice=${needPrice} lens=${matches.length} brand=${idBrand.brand ?? "—"}`);

 // Price — only when the seller didn't type one. The query/context prefer their
 // typed values, falling back to the AI draft.
 let estimate = null;
 if (needPrice) {
 const brandVal = has("brand") ? val("brand") : (draft?.brand?.value || "");
 const titleVal = has("title") ? val("title") : (draft?.title || "");
 const eraVal = has("era") ? val("era") : (draft?.era?.value || "");
 const matVal = has("material") ? val("material") : (draft?.material?.value || "");
 const catVal = has("category") ? val("category") : (draft?.category || "");
 const baseTitle = titleVal || [eraVal, matVal, catVal].filter(Boolean).join(" ");
 const query = brandVal && !baseTitle.toLowerCase().includes(brandVal.toLowerCase()) ? `${brandVal} ${baseTitle}` : baseTitle;
 const minMarkupBps = await getMinMarkupBps(slug).catch(() => 3000);
 // Live resale-market demand — Google search interest across the whole secondhand world
 // (not VYA's own pilot traffic). Hot designers earn a modest premium in the valuation.
 const trendQuery = brandVal ? (catVal ? `${brandVal} ${catVal}` : brandVal) : "";
 const trend = trendQuery ? await fetchResaleTrend(trendQuery).catch(() => null) : null;
 estimate = await AI_GATE().run(() => estimatePrice({
 query,
 photoUrl: mainUrl,
 minMarkupBps,
 knowledgeHintCents: draft?.priceHint ? draft.priceHint * 100 : null,
 extraComps: matchesToComps(relevantMatches),
 // Qualitative for the model — a raw momentum % must not become a price multiplier.
 context: { brand: brandVal || null, era: eraVal || null, runway: draft?.runway ?? null, trend: trend?.trending ? `${brandVal} has rising demand across the resale market (${trend.note})` : null },
 })).catch(() => null);
 if (estimate && trend?.trending) estimate.rationale += ` · 🔥 ${brandVal} trending (${trend.note})`;

 // Scale by how this store prices vs. market (learned). marketCents stays raw.
 if (estimate && estimate.marketCents) {
 const mult = await getStorePriceMultiplier(slug).catch(() => 1);
 if (mult !== 1) {
 const adjusted = Math.round(estimate.marketCents * mult);
 estimate.suggestedCents = Math.max(adjusted, estimate.floorCents ?? 0);
 const pct = Math.round((mult - 1) * 100);
 estimate.rationale += ` · ${pct >= 0 ? "+" : ""}${pct}% for this store's pricing`;
 }
 }
 }

 // If the vision draft didn't name a runway, mine the real comps/matches for a
 // documented season the resellers cite (it often lives in the price comps, which
 // the draft step never saw).
 if (draft && !draft.runway) {
 const b = has("brand") ? val("brand") : (draft.brand?.value || "");
 const titles = [...relevantMatches.map((m) => m.title), ...(estimate?.comps || []).map((c) => c.title)];
 const rw = extractRunway(b, titles);
 if (rw) draft.runway = rw;
 }

 return NextResponse.json({
 ok: true, draft, ghostUrl, photoroom: isPhotoroomConfigured(), estimate, embedding, promptVersion: PROMPT_VERSION,
 // Only surface the reverse-image brand banner when WE identified the brand — never
 // when the seller supplied it (their brand stands, and Lens can find a look-alike).
 reverseImage: needReverse && !has("brand") ? { matches: matches.length, brand: idBrand.brand, hits: idBrand.hits, sampleTitles: matches.slice(0, 6).map((m) => m.title) } : null,
 });
}
