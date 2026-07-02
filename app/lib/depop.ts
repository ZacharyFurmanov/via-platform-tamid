/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDepopTokens, updateDepopAccessToken } from "./depop-tokens-db";

// Depop Selling API integration (partner-gated: apply via partner@depop.com). Mirrors the
// eBay cross-lister: connect account → create/update a listing (upsert by SKU = our
// itemId) → delete to pull it. Env-gated, so with no Depop app configured callers no-op.
//
// Two bits finalize when Depop sends partner onboarding (they're not in the public docs):
//  - the OAuth token/refresh URL (DEPOP_TOKEN_URL) and connect handshake
//  - the exact `condition` enum + a few attribute IDs (we map best-effort from taxonomy)
// Everything else here is built to the published Selling API + taxonomy docs.

const PARTNER_API = "https://partnerapi.depop.com";
const TAXONOMY_URL = "https://api.depop.com/api/v3/attributes/";

export function depopConfigured(): boolean {
 return !!(process.env.DEPOP_CLIENT_ID && process.env.DEPOP_CLIENT_SECRET);
}

// A valid per-seller access token, refreshing via OAuth if we have a refresh token +
// token URL. Returns null if the seller hasn't connected Depop.
async function accessToken(storeSlug: string): Promise<string | null> {
 const t = await getDepopTokens(storeSlug);
 if (!t) return null;
 if (!t.expiresAt || new Date(t.expiresAt).getTime() > Date.now()) return t.accessToken;
 const tokenUrl = process.env.DEPOP_TOKEN_URL;
 if (!t.refreshToken || !tokenUrl) return t.accessToken; // best effort — may still be valid
 const res = await fetch(tokenUrl, {
 method: "POST",
 headers: { "Content-Type": "application/x-www-form-urlencoded" },
 body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: t.refreshToken, client_id: process.env.DEPOP_CLIENT_ID || "", client_secret: process.env.DEPOP_CLIENT_SECRET || "" }),
 }).catch(() => null);
 if (!res || !res.ok) return t.accessToken;
 const j = await res.json().catch(() => null);
 if (!j?.access_token) return t.accessToken;
 await updateDepopAccessToken(storeSlug, j.access_token, Number(j.expires_in) || 3600);
 return j.access_token;
}

export async function depopConnected(storeSlug: string): Promise<boolean> {
 return !!(await getDepopTokens(storeSlug));
}

// --- Taxonomy (cached ~1h) ------------------------------------------------------------
let taxonomyCache: { at: number; data: any } | null = null;
async function taxonomy(): Promise<any | null> {
 if (taxonomyCache && Date.now() - taxonomyCache.at < 3600_000) return taxonomyCache.data;
 const res = await fetch(TAXONOMY_URL, { headers: { "User-Agent": "Partner" } }).catch(() => null);
 if (!res || !res.ok) return taxonomyCache?.data ?? null;
 const data = await res.json().catch(() => null);
 if (data) taxonomyCache = { at: Date.now(), data };
 return data;
}

const lc = (s: string) => (s || "").toLowerCase();

// Map our category/size onto Depop's department + product_type + size_set_id/size_id.
async function resolveCategory(item: DepopItem): Promise<{ department: string; product_type?: string; size_set_id?: string; size_id?: string }> {
 const tax = await taxonomy();
 const cat = lc(item.category || "");
 // Department: infer from category keywords; default womenswear (largest on Depop).
 const department = /men|guy|male/.test(cat) && !/women/.test(cat) ? "menswear" : "womenswear";
 if (!tax) return { department };

 // Product type: first group whose name matches a word in our category.
 const groups: any[] = Array.isArray(tax.group) ? tax.group : Object.values(tax.group || {});
 const pt = groups.find((g: any) => cat && lc(g?.name || g?.slug || "").split(/\W+/).some((w: string) => w && cat.includes(w)));
 const product_type = pt?.id || pt?.slug || undefined;

 // Size: find the US size_set for this dept/product_type, then the matching size_id.
 let size_set_id: string | undefined, size_id: string | undefined;
 if (item.size && product_type) {
 const mapping: any[] = Array.isArray(tax.category_size_mapping) ? tax.category_size_mapping : Object.values(tax.category_size_mapping || {});
 const m = mapping.find((x: any) => (x?.product_type === product_type || x?.group === product_type) && /us/i.test(x?.region || x?.regions || "US"));
 size_set_id = m?.size_set_id;
 const sets: any = tax.size_sets || {};
 const set = size_set_id ? (Array.isArray(sets) ? sets.find((s: any) => s.size_set_id === size_set_id) : sets[size_set_id]) : null;
 const sizes: any[] = set?.sizes || set || [];
 const hit = Array.isArray(sizes) ? sizes.find((s: any) => lc(s?.name || s?.label || "") === lc(item.size!)) : null;
 size_id = hit?.size_id;
 }
 return { department, product_type, size_set_id, size_id };
}

const CONDITION_MAP: Record<string, string> = {
 new: "brand_new", "brand new": "brand_new", "like new": "used_like_new", excellent: "used_excellent",
 "very good": "used_very_good", good: "used_good", fair: "used_fair", vintage: "used_good",
};

export type DepopItem = { itemId: string; title: string; description?: string | null; brand?: string | null; condition?: string | null; size?: string | null; category?: string | null; colour?: string | null; priceCents: number; currency?: string; images: string[] };
export type DepopResult = { ok: boolean; listingUrl?: string; error?: string };

// Create/update a Depop listing (PUT upsert by SKU). Returns the listing URL.
export async function listOnDepop(storeSlug: string, item: DepopItem): Promise<DepopResult> {
 if (!depopConfigured()) return { ok: false, error: "Depop isn’t configured on the server." };
 const token = await accessToken(storeSlug);
 if (!token) return { ok: false, error: "Depop isn’t connected — reconnect the account." };
 const images = (item.images || []).filter((u) => /^https?:\/\//.test(u)).slice(0, 8);
 if (!images.length) return { ok: false, error: "Depop needs at least one hosted image." };

 const cat = await resolveCategory(item);
 const pictures = images.map((url, i) => ({ url: i === 0 ? `${url}#type=cover-image` : url }));
 const body: Record<string, any> = {
 description: `${item.brand ? item.brand + " — " : ""}${item.title}${item.description ? "\n\n" + item.description : ""}`.slice(0, 1000),
 price_currency: item.currency || "USD",
 price_amount: (item.priceCents / 100).toFixed(2),
 national_shipping_cost: "0.00",
 quantity: 1,
 department: cat.department,
 ...(cat.product_type ? { product_type: cat.product_type } : {}),
 ...(cat.size_set_id ? { size_set_id: cat.size_set_id } : {}),
 ...(cat.size_id ? { size_id: cat.size_id } : {}),
 condition: CONDITION_MAP[lc(item.condition || "")] || "used_good",
 ...(item.brand ? { brand: item.brand } : {}),
 ...(item.colour ? { colour: item.colour } : {}),
 pictures,
 };

 const res = await fetch(`${PARTNER_API}/api/v1/products/${encodeURIComponent(item.itemId)}`, {
 method: "PUT",
 headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
 body: JSON.stringify(body),
 }).catch(() => null);
 if (!res) return { ok: false, error: "Couldn’t reach Depop." };
 const j = await res.json().catch(() => null);
 if (!res.ok) return { ok: false, error: `Depop: ${j?.error?.message || j?.message || res.status}` };
 const slug = j?.slug || j?.product?.slug || item.itemId;
 return { ok: true, listingUrl: `https://www.depop.com/products/${slug}` };
}

// Pull a Depop listing (delete by SKU) — used when it sells elsewhere.
export async function endOnDepop(storeSlug: string, itemId: string): Promise<boolean> {
 if (!depopConfigured()) return false;
 const token = await accessToken(storeSlug);
 if (!token) return false;
 const res = await fetch(`${PARTNER_API}/api/v1/products/${encodeURIComponent(itemId)}`, {
 method: "DELETE",
 headers: { Authorization: `Bearer ${token}` },
 }).catch(() => null);
 return !!res && res.ok;
}
