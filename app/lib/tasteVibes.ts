// Aesthetic "vibes" for the new-user taste test. Each vibe maps to lowercase
// title/brand keywords used to bias the personalized feed toward a user's taste
// before they've built up behavioral signal. Keys are stable — the mobile app
// references the same keys (see via-app/lib/tasteVibes.ts).

export type Vibe = { key: string; label: string; keywords: string[] };

export const VIBES: Vibe[] = [
 {
 key: "minimalist",
 label: "Minimalist",
 keywords: ["minimal", "minimalist", "clean", "tailored", "the row", "cos", "toteme", "jil sander", "helmut lang", "everlane", "neutral"],
 },
 {
 key: "old-money",
 label: "Old Money",
 keywords: ["cashmere", "tweed", "loafer", "polo", "blazer", "ralph lauren", "burberry", "brooks brothers", "hermes", "loro piana", "pendleton", "argyle", "oxford", "trench"],
 },
 {
 key: "y2k",
 label: "Y2K",
 keywords: ["y2k", "low rise", "low-rise", "rhinestone", "baby tee", "von dutch", "ed hardy", "juicy couture", "mini skirt", "halter", "baguette", "butterfly"],
 },
 {
 key: "boho",
 label: "Boho",
 keywords: ["boho", "bohemian", "crochet", "fringe", "paisley", "maxi", "suede", "peasant", "embroidered", "free people", "kimono", "tassel"],
 },
 {
 key: "grunge",
 label: "Grunge",
 keywords: ["grunge", "leather", "moto", "plaid", "flannel", "combat", "distressed", "band tee", "band t-shirt", "ripped", "goth", "studded"],
 },
 {
 key: "romantic",
 label: "Romantic",
 keywords: ["lace", "floral", "bow", "ruffle", "silk", "pearl", "corset", "mesh", "slip dress", "sheer", "feather", "satin"],
 },
 {
 key: "avant-garde",
 label: "Avant-Garde",
 keywords: ["asymmetric", "avant", "sculptural", "yohji", "yamamoto", "comme des garcons", "margiela", "issey miyake", "rick owens", "deconstructed", "pleats"],
 },
 {
 key: "streetwear",
 label: "Streetwear",
 keywords: ["hoodie", "sneaker", "cargo", "supreme", "carhartt", "nike", "adidas", "stussy", "graphic tee", "track", "bomber", "oversized"],
 },
];

const VIBE_BY_KEY = new Map(VIBES.map((v) => [v.key, v]));

export const VIBE_KEYS = VIBES.map((v) => v.key);

/** Returns the deduped lowercase keyword list for the given vibe keys. */
export function vibeKeywords(keys: string[] | null | undefined): string[] {
 if (!keys || keys.length === 0) return [];
 const out = new Set<string>();
 for (const k of keys) {
 const v = VIBE_BY_KEY.get(k);
 if (v) for (const kw of v.keywords) out.add(kw.toLowerCase());
 }
 return Array.from(out);
}

/** Validates/normalizes incoming vibe keys against the known set. */
export function sanitizeVibes(input: unknown): string[] {
 if (!Array.isArray(input)) return [];
 const valid = new Set(VIBE_KEYS);
 return Array.from(new Set(input.filter((k): k is string => typeof k === "string" && valid.has(k))));
}
