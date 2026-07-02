// ───────────────────────────────────────────────────────────────────────────
// AI intake — the wedge. A photo in, a drafted listing out: title, era, material
// (read off the care tag), condition, brand, a price hint — each with a
// confidence so the review screen can gate the risky fields (material, era,
// authenticity) for the seller to confirm before publishing.
// Uses Claude vision (raw REST, matching app/lib/data-layer/vision.ts).
// ───────────────────────────────────────────────────────────────────────────

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const INTAKE_MODEL = "claude-sonnet-4-6"; // capable + cost-fit for high-volume intake

export function isIntakeConfigured(): boolean {
 return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type DraftField = { value: string | null; confidence: number };
export type ListingDraft = {
 title: string;
 description: string; // SEO-optimized resale description
 brand: DraftField;
 era: DraftField;
 material: DraftField;
 condition: DraftField;
 category: string | null;
 careTag: string | null; // verbatim care/composition label text, if legible
 runway: string | null; // runway collection/season if identifiable, e.g. "Blumarine F/W 2002"
 priceHint: number | null; // suggested USD price
 parcel: { weightOz: number; lengthIn: number; widthIn: number; heightIn: number }; // estimated shipping parcel
};

// Fields where a wrong guess is costly — gated for confirmation when low-confidence.
export const RISKY_FIELDS = ["brand", "era", "material"] as const;
export const CONFIDENCE_THRESHOLD = 0.75;
export function needsReview(field: DraftField): boolean {
 return !field.value || field.confidence < CONFIDENCE_THRESHOLD;
}

// Bump when the intake prompts/logic change materially — stamped on every training
// example so we never blend guesses from different "brain eras" when training.
export const PROMPT_VERSION = "2026-07-01";

const SYSTEM =
 "You are a vintage & secondhand fashion expert drafting a resale listing from product photos. Identify the piece precisely and read any visible care/composition tag for fabric content. You also write the SEO-optimized description and benchmark price the way the best resale sellers do — drawing on how comparable pieces are titled, described, and sold on Grailed, eBay (sold listings), Vestiaire Collective, and Depop. Authentication, era, and material are high-stakes — only give high confidence when the visual evidence is genuinely clear; otherwise lower the confidence or return null. Never invent facts (measurements, flaws, provenance) you can't see. RUNWAY PROVENANCE: when a recognizable designer piece clearly matches a documented runway collection, COMMIT to the specific season/year (these are well-documented — e.g. the brown ruched Tom Ford for Gucci pieces are S/S 2004; Cavalli poppy-print gowns are S/S 2003) and weave that provenance in. Do NOT hedge to era-level (e.g. just 'Tom Ford era') or leave it blank out of over-caution when you clearly recognize the collection — if the description names a designer/era/collection, the runway field MUST name the exact season+year. Only avoid a runway for a generic piece not tied to a specific documented show; never fabricate one for a no-name piece.\n\nCRITICAL — BRANDING: Do NOT name a specific brand or designer from silhouette, fabric, color, or overall 'vibe' alone. A designer-LOOKING dress is not evidence of any particular house. Assign a brand ONLY when there is (a) a visible label/logo/hardware/monogram in the photo, (b) reverse-image-search matches provided to you that point to it, or (c) an unmistakable, documented archival design. Absent that, return brand = null with low confidence — an honest 'unbranded' beats a confident wrong label. Never default to a 'house style' guess (e.g. assuming every slinky Y2K piece is one particular Italian house).";

const INSTRUCTION = `Return ONLY a JSON object (no prose, no markdown) with exactly this shape:
{
 "title": string,                                  // clean, search-friendly title, e.g. "1990s Prada nylon shoulder bag"
 "description": string,                            // Polished, ready-to-publish boutique copy — 2-3 sentences, ~40-80 words. Lead with the terms buyers search (brand, item, era, standout detail), then silhouette, fabric/color, and the one or two most distinctive details. If from a documented runway collection, weave the provenance in as a selling point naming the SPECIFIC season+year (e.g. "from the Tom Ford for Gucci S/S 2004 runway"), not just the era ("Tom Ford era"). End with a brief, honest condition note. See the STRICT DESCRIPTION RULES below.
 "brand": {"value": string|null, "confidence": number},
 "era": {"value": string|null, "confidence": number},      // e.g. "1990s","Y2K","2000s"
 "material": {"value": string|null, "confidence": number}, // prefer the care tag if legible
 "condition": {"value": string|null, "confidence": number},
 "category": string|null,                          // e.g. "bags","dresses","shoes","tops"
 "careTag": string|null,                           // verbatim text legible on the care/composition label, else null
 "runway": string|null,                            // The specific runway collection, formatted "Brand S/S YYYY" or "Brand F/W YYYY" (e.g. "Tom Ford for Gucci S/S 2004", "Blumarine F/W 2002"). NAME IT whenever the designer + distinctive design match a documented, recognizable collection — do not hedge to era-level or blank it out of over-caution. If your description references a designer/era/collection, this field MUST carry the exact season+year. null ONLY for generic pieces not tied to a specific show.
 "priceHint": number|null,                         // suggested resale price in USD (integer), benchmarked to how comparable pieces sell on Grailed / eBay sold / Vestiaire / Depop given brand, era, rarity, and condition
 "parcel": {"weightOz": int, "lengthIn": int, "widthIn": int, "heightIn": int}   // estimated SHIPPING parcel (packed, incl. packaging). Judge weight from the ACTUAL item shown — its size, material, and heft — NOT a blanket category default. A strappy sandal weighs a fraction of a boot. Guide ranges (oz): strappy sandals / kitten heels / thin flats ≈ 12-18; pumps / heels / loafers / ballet flats ≈ 16-26; sneakers ≈ 28-40; ankle boots ≈ 36-52; tall/heavy boots ≈ 52-72; tee / thin top ≈ 6-10; blouse / light dress ≈ 10-18; knit sweater ≈ 16-28; jeans ≈ 20-28; coat ≈ 40-64; handbag ≈ 16-40 (small clutch ≈ 12). Box dims (in): sandals/heels/accessories ≈ 12x8x4; sneakers ≈ 13x8x5; boots/coats ≈ 16x12x6; folded garments ≈ 12x10x2. Do NOT over-weight lightweight items.
}
confidence is a number 0..1.

STRICT DESCRIPTION RULES (the "description" field is customer-facing storefront copy):
- NEVER reveal how you identified anything. No "reverse image search", "web matches", "the photos provided/shown", "I can see", "based on the image", "AI", or any mention of confidence/uncertainty. The shopper must never see your detection process.
- NEVER hedge. Write with the assured voice of an expert seller. If you're unsure of a fact, OMIT it — do not write "appears to be", "likely", "seems", or "no care tag is legible".
- Keep it TIGHT: 2-3 sentences. No purple prose, no cataloguing every panel/seam/strap, no hype, no invented facts (measurements, flaws, provenance you aren't sure of).
- Material/care uncertainty belongs ONLY in the structured fields, never in the description.
- It must read as finished retail copy a boutique would publish as-is.`;

/* eslint-disable @typescript-eslint/no-explicit-any */
function toField(f: any): DraftField {
 const confidence = typeof f?.confidence === "number" ? Math.max(0, Math.min(1, f.confidence)) : 0;
 const value = typeof f?.value === "string" && f.value.trim() ? f.value.trim() : null;
 return { value, confidence };
}

function parseDraft(text: string): ListingDraft {
 const m = text.match(/\{[\s\S]*\}/);
 let raw: any = {};
 try {
 raw = m ? JSON.parse(m[0]) : {};
 } catch {
 raw = {};
 }
 return {
 title: typeof raw.title === "string" ? raw.title.trim().slice(0, 200) : "",
 description: typeof raw.description === "string" ? raw.description.trim().slice(0, 2000) : "",
 brand: toField(raw.brand),
 era: toField(raw.era),
 material: toField(raw.material),
 condition: toField(raw.condition),
 category: typeof raw.category === "string" ? raw.category.trim() : null,
 careTag: typeof raw.careTag === "string" && raw.careTag.trim() ? raw.careTag.trim() : null,
 runway: typeof raw.runway === "string" && raw.runway.trim() ? raw.runway.trim().slice(0, 120) : null,
 priceHint: typeof raw.priceHint === "number" && raw.priceHint > 0 ? Math.round(raw.priceHint) : null,
 parcel: parseParcel(raw.parcel),
 };
}

// Estimated shipping parcel with safe defaults (a medium poly mailer) when the
// model omits a dimension — a label always needs a complete parcel.
function parseParcel(p: any): { weightOz: number; lengthIn: number; widthIn: number; heightIn: number } {
 const n = (v: any, d: number) => (typeof v === "number" && v > 0 ? Math.round(v) : d);
 return { weightOz: n(p?.weightOz, 16), lengthIn: n(p?.lengthIn, 12), widthIn: n(p?.widthIn, 9), heightIn: n(p?.heightIn, 3) };
}

/**
 * Draft a listing from one or more product photo URLs. If `voice` is supplied
 * (the store's learned writing voice + real examples), the description is written
 * in that voice so it reads like the store — not like generic AI.
 */
export async function draftListing(
 imageUrls: string[],
 voice?: { guide: string; examples: string[] },
 hints?: string,
 known?: Record<string, string>,
): Promise<ListingDraft> {
 const apiKey = process.env.ANTHROPIC_API_KEY;
 if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

 const images = imageUrls.filter(Boolean).slice(0, 6).map((url) => ({ type: "image", source: { type: "url", url } }));
 if (!images.length) throw new Error("No images provided");

 // Anything the seller typed by hand is GROUND TRUTH — the copy must honor it and
 // never contradict it (esp. condition: don't upgrade "good" to "excellent").
 const knownEntries = known ? Object.entries(known).filter(([, v]) => v && v.trim()) : [];
 const knownBlock = knownEntries.length
 ? `\n\nSELLER-PROVIDED FACTS (authoritative — the seller entered these by hand):\n${knownEntries.map(([k, v]) => `- ${k}: ${v}`).join("\n")}\nTreat these as GROUND TRUTH. Write the title and description fully consistent with them and NEVER contradict them. In particular, honor the seller's stated CONDITION exactly — never upgrade or embellish it (if they said "good", do not write "excellent", "pristine", or "like new"). For the matching JSON fields, return the seller's value unchanged. Fill only the fields they did NOT provide from the photos.`
 : "";

 const voiceBlock = voice?.guide
 ? `\n\nIMPORTANT — write the "description" in THIS store's own voice so it reads like they wrote it, NOT like generic AI.\nTheir voice: ${voice.guide}` +
 (voice.examples?.length
 ? `\nReal examples of how they write their listings:\n${voice.examples.map((e, i) => `${i + 1}. "${e.slice(0, 400)}"`).join("\n")}`
 : "") +
 `\nMatch their FORMAT/STRUCTURE (section order, labels, line breaks, template) AND their tone, sentence length, vocabulary, punctuation, and what they lead with — while staying accurate to the photo. If they follow a strict template, follow it exactly; if their listings vary, vary the same way. Do not copy the example wording verbatim.`
 : "";

 const res = await fetch(ANTHROPIC_URL, {
 method: "POST",
 headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
 body: JSON.stringify({
 model: INTAKE_MODEL,
 max_tokens: 1200,
 system: SYSTEM,
 messages: [{ role: "user", content: [...images, { type: "text", text: INSTRUCTION + knownBlock + voiceBlock + (hints || "") }] }],
 }),
 });
 if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
 const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
 const text = data.content?.find((c) => c.type === "text")?.text ?? "";
 return parseDraft(text);
}
