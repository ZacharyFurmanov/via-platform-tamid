import type { ImportedProduct } from "./store-import";
import { formatPrice } from "./formatPrice";
import { verifyConnection as shopifyVerify } from "./shopify-storefront";
import { isAdminToken, adminVerify, adminGetProducts } from "./shopify-admin";

// ───────────────────────────────────────────────────────────────────────────
// Platform adapters. Each knows how to verify a seller's credentials and (for
// platforms with no public feed, like Square/Wix) pull products via their API.
// Adding a platform = adding one adapter here + a row in PLATFORMS.
// ───────────────────────────────────────────────────────────────────────────

export type ConnectField = { key: string; label: string; placeholder: string };
export type VerifyResult = { ok: boolean; label?: string; error?: string };
export type PlatformAdapter = {
 id: string;
 name: string;
 fields: ConnectField[];
 needsConnectionForProducts: boolean; // true = no public feed; products only come via the API
 verify(creds: Record<string, string>): Promise<VerifyResult>;
 getProducts?(creds: Record<string, string>): Promise<ImportedProduct[]>;
};

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Shopify ──────────────────────────────────────────────────────────────────
const shopify: PlatformAdapter = {
 id: "shopify",
 name: "Shopify",
 fields: [
 { key: "shopDomain", label: "Store domain", placeholder: "your-store.myshopify.com" },
 { key: "token", label: "API access token", placeholder: "Admin token (shpat_…) or Storefront token" },
 ],
 needsConnectionForProducts: false, // public feed works for live stores; Admin API used when it doesn't
 async verify(c) {
 const token = (c.token || "").trim();
 const shop = c.shopDomain || "";
 return isAdminToken(token) ? adminVerify(shop, token) : shopifyVerify(shop, token);
 },
 // Used when the public feed returns nothing (password-protected stores) or to get
 // exact data. Admin token → Admin API; Storefront token → fall back to the feed.
 async getProducts(c) {
 const token = (c.token || "").trim();
 return isAdminToken(token) ? adminGetProducts(c.shopDomain || "", token) : [];
 },
};

// ── Square ───────────────────────────────────────────────────────────────────
const SQUARE_VERSION = "2024-10-17";
async function squareList(token: string, types: string, cursor?: string): Promise<any> {
 const url = `https://connect.squareup.com/v2/catalog/list?types=${types}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
 const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "Square-Version": SQUARE_VERSION }, signal: AbortSignal.timeout(20000) });
 if (r.status === 401 || r.status === 403) throw new Error("Invalid Square access token.");
 const j = await r.json();
 if (j.errors?.length) throw new Error(j.errors[0]?.detail || "Square API error");
 return j;
}
const square: PlatformAdapter = {
 id: "square",
 name: "Square",
 fields: [{ key: "accessToken", label: "Square access token", placeholder: "Paste your Square access token" }],
 needsConnectionForProducts: true,
 async verify(c) {
 try {
 await squareList(c.accessToken || "", "ITEM");
 return { ok: true };
 } catch (e: any) {
 return { ok: false, error: e?.message || "Couldn’t connect to Square." };
 }
 },
 async getProducts(c) {
 const token = c.accessToken || "";
 const items: any[] = [];
 const images = new Map<string, string>();
 let cursor: string | undefined;
 for (let page = 0; page < 30; page++) {
 const d = await squareList(token, "ITEM,IMAGE", cursor);
 for (const o of d.objects || []) {
 if (o.type === "ITEM") items.push(o);
 else if (o.type === "IMAGE" && o.image_data?.url) images.set(o.id, o.image_data.url);
 }
 cursor = d.cursor;
 if (!cursor) break;
 }
 const out: ImportedProduct[] = [];
 for (const it of items) {
 const data = it.item_data || {};
 const variation = (data.variations || [])[0]?.item_variation_data;
 const money = variation?.price_money;
 const price = typeof money?.amount === "number" ? money.amount / 100 : 0;
 const imgs = (data.image_ids || []).map((id: string) => images.get(id)).filter(Boolean) as string[];
 const available = (data.variations || []).some((v: any) => v.item_variation_data?.sellable !== false);
 out.push({
 name: String(data.name || "").trim(),
 price: price > 0 ? formatPrice(price, money?.currency || "USD") : "",
 image: imgs[0] || "",
 images: imgs,
 description: data.description ? String(data.description).replace(/\s+/g, " ").trim().slice(0, 2000) : null,
 size: null,
 available,
 tags: Array.isArray(data.categories) ? data.categories.map((x: any) => String(x?.name || x)).filter(Boolean) : [],
 });
 }
 return out.filter((p) => p.name && p.image);
 },
};

// ── Wix ──────────────────────────────────────────────────────────────────────
async function wixQuery(apiKey: string, siteId: string, offset: number): Promise<any> {
 const r = await fetch("https://www.wixapis.com/stores/v1/products/query", {
 method: "POST",
 headers: { Authorization: apiKey, "wix-site-id": siteId, "Content-Type": "application/json" },
 body: JSON.stringify({ query: { paging: { limit: 100, offset } } }),
 signal: AbortSignal.timeout(20000),
 });
 if (r.status === 401 || r.status === 403) throw new Error("Invalid Wix API key or site ID.");
 const j = await r.json();
 if (j?.message && !j?.products) throw new Error(j.message);
 return j;
}
const wix: PlatformAdapter = {
 id: "wix",
 name: "Wix",
 fields: [
 { key: "apiKey", label: "Wix API key", placeholder: "Paste your Wix API key" },
 { key: "siteId", label: "Wix site ID", placeholder: "Your Wix site ID" },
 ],
 needsConnectionForProducts: true,
 async verify(c) {
 try {
 await wixQuery(c.apiKey || "", c.siteId || "", 0);
 return { ok: true };
 } catch (e: any) {
 return { ok: false, error: e?.message || "Couldn’t connect to Wix." };
 }
 },
 async getProducts(c) {
 const out: ImportedProduct[] = [];
 for (let offset = 0; offset < 3000; offset += 100) {
 const d = await wixQuery(c.apiKey || "", c.siteId || "", offset);
 const prods: any[] = d.products || [];
 if (!prods.length) break;
 for (const p of prods) {
 const price = p.priceData?.price ?? p.price?.price ?? 0;
 const currency = p.priceData?.currency || "USD";
 const imgs: string[] = [];
 if (p.media?.mainMedia?.image?.url) imgs.push(p.media.mainMedia.image.url);
 for (const it of p.media?.items || []) if (it.image?.url) imgs.push(it.image.url);
 out.push({
 name: String(p.name || "").trim(),
 price: price > 0 ? formatPrice(price, currency) : "",
 image: imgs[0] || "",
 images: [...new Set(imgs)],
 description: p.description ? String(p.description).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000) : null,
 size: null,
 available: p.stock?.inStock !== false,
 tags: [],
 });
 }
 if (prods.length < 100) break;
 }
 return out.filter((p) => p.name && p.image);
 },
};

export const PLATFORMS: PlatformAdapter[] = [shopify, square, wix];
export function getPlatform(id: string): PlatformAdapter | undefined {
 return PLATFORMS.find((p) => p.id === id);
}
