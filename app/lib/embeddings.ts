// Multimodal image embeddings (Voyage) for the intake visual-memory layer.
// We embed each listing photo so a new upload can be matched against the seller's
// own past pieces ("this looks like 3 things you listed as Blumarine").
//
// Gated on VOYAGE_API_KEY — if it's not set, embedImage returns null and the whole
// visual-retrieval path degrades gracefully back to the v1 text hints.

const VOYAGE_URL = "https://api.voyageai.com/v1/multimodalembeddings";
const MODEL = "voyage-multimodal-3"; // 1024-dim, text+image

export function isEmbeddingConfigured(): boolean {
 return Boolean(process.env.VOYAGE_API_KEY);
}

/** Embed a single image by URL. Returns the vector, or null on any failure. */
export async function embedImage(imageUrl: string): Promise<number[] | null> {
 const key = process.env.VOYAGE_API_KEY;
 if (!key || !imageUrl) return null;
 try {
 const res = await fetch(VOYAGE_URL, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
  body: JSON.stringify({
  model: MODEL,
  inputs: [{ content: [{ type: "image_url", image_url: imageUrl }] }],
  }),
  signal: AbortSignal.timeout(15000),
 });
 if (!res.ok) {
  console.error(`[embeddings] Voyage ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return null;
 }
 const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
 const emb = data?.data?.[0]?.embedding;
 return Array.isArray(emb) && emb.length > 0 ? emb : null;
 } catch (err) {
 console.error("[embeddings] failed:", err);
 return null;
 }
}

/** Cosine similarity between two equal-length vectors (0..1 for normalized inputs). */
export function cosine(a: number[], b: number[]): number {
 let dot = 0, na = 0, nb = 0;
 const n = Math.min(a.length, b.length);
 for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
 return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}
