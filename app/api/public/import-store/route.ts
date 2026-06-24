import { NextResponse } from "next/server";
import { fetchShopifyProductsPublic } from "@/app/lib/shopifyClient";
import { formatPrice } from "@/app/lib/formatPrice";

export const dynamic = "force-dynamic";
export const maxDuration = 25;

// Live "import a site" for the /infrastructure builder: pulls a real Shopify or
// Squarespace storefront server-side (browsers can't, CORS) and returns the store
// name, a brand color, and products + images so the mockup shows their real shop.

type ImportedProduct = { name: string; price: string; image: string };

/** Reject anything that isn't a plain public web domain (basic SSRF guard). */
function safeUrl(raw: string): URL | null {
 let u: URL;
 try {
 u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
 } catch {
 return null;
 }
 if (u.protocol !== "https:" && u.protocol !== "http:") return null;
 const h = u.hostname.toLowerCase();
 if (!h.includes(".")) return null;
 if (h === "localhost" || /\.(local|internal|lan|test)$/.test(h)) return null;
 if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return null; // bare IPv4
 if (h.includes(":")) return null; // IPv6 literal
 return u;
}

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
 return Promise.race([
 p,
 new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
 ]);
}

const titleCase = (s: string) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();

/** Pull store name / brand color / platform hints from the homepage <head>. */
async function readHomepage(origin: string) {
 const empty = { name: null as string | null, color: null as string | null, hero: null as string | null };
 try {
 const res = await fetch(origin, {
 headers: { "User-Agent": "Mozilla/5.0 (compatible; VYA-Importer/1.0)" },
 signal: AbortSignal.timeout(8000),
 });
 const head = (await res.text()).slice(0, 80000);
 const pick = (re: RegExp) => head.match(re)?.[1]?.trim() || null;
 const ogSite =
 pick(/property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i) ||
 pick(/content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
 const title = pick(/<title[^>]*>([^<]+)<\/title>/i);
 const color = pick(/name=["']theme-color["'][^>]*content=["'](#[0-9a-fA-F]{3,8})["']/i);
 const hero = pick(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
 let name = (ogSite || title || "")
 .replace(/[\u200B-\u200D\uFEFF\u00A0\u202A-\u202E]/g, "") // strip zero-width / control chars
 .trim();
 name = name.split(/\s+[|–—·-]\s+/)[0].trim(); // "Store — tagline" → "Store"
 return { name: name.length >= 2 ? name : null, color, hero };
 } catch {
 return empty;
 }
}

/** Lightweight Squarespace read: one ?format=json call, commerce items only. */
async function fetchSquarespaceLite(shopUrl: string, max = 12): Promise<ImportedProduct[]> {
 try {
 const url = shopUrl.replace(/\?.*$/, "") + "?format=json";
 const res = await fetch(url, {
 headers: { "User-Agent": "Mozilla/5.0 (compatible; VYA-Importer/1.0)", Accept: "application/json" },
 signal: AbortSignal.timeout(8000),
 });
 if (!res.ok) return [];
 const data = await res.json();
 const items: any[] = Array.isArray(data.items) ? data.items : [];
 const out: ImportedProduct[] = [];
 for (const it of items) {
 const variant = it.variants?.[0];
 if (!variant) continue; // not a commerce product
 const cents = variant.onSale ? variant.salePrice : variant.price;
 const price = cents / 100;
 if (!(price > 0)) continue;
 const gallery = (it.items || []).map((g: any) => g.assetUrl).filter(Boolean);
 const image = gallery[0] || (it.assetUrl && /\.(jpe?g|png|webp|gif)/i.test(it.assetUrl) ? it.assetUrl : null);
 if (!image) continue;
 out.push({ name: (it.title || "").trim(), price: formatPrice(price, "USD"), image });
 if (out.length >= max) break;
 }
 return out;
 } catch {
 return [];
 }
}

export async function GET(request: Request) {
 const { searchParams } = new URL(request.url);
 const raw = (searchParams.get("url") || "").trim();
 if (!raw) return NextResponse.json({ error: "url required" }, { status: 400 });

 const u = safeUrl(raw);
 if (!u) return NextResponse.json({ ok: false, error: "Enter a valid store URL." }, { status: 400 });

 const origin = u.origin;
 const domain = u.hostname.replace(/^www\./, "");
 const meta = await readHomepage(origin);
 const storeName = meta.name || titleCase(domain.split(".")[0]);

 let products: ImportedProduct[] = [];
 let platform: "shopify" | "squarespace" | "unknown" = "unknown";

 // 1) Shopify public products.json (works for most Shopify stores, no token)
 try {
 const r = await withTimeout(
 fetchShopifyProductsPublic(domain, storeName, 12, "USD", true),
 12000,
 { products: [], skippedCount: 0 },
 );
 const mapped = r.products
 .filter((p) => p.image)
 .slice(0, 12)
 .map((p) => ({
 name: p.title,
 price: p.price != null ? formatPrice(p.price, p.currency) : "",
 image: p.image as string,
 }));
 if (mapped.length) {
 platform = "shopify";
 products = mapped;
 }
 } catch {}

 // 2) Squarespace ?format=json on the pasted path + common commerce paths
 if (!products.length) {
 const candidates = Array.from(
 new Set([u.href, `${origin}/shop`, `${origin}/store`, `${origin}/products`, origin]),
 );
 for (const c of candidates) {
 const found = await fetchSquarespaceLite(c, 12);
 if (found.length) {
 platform = "squarespace";
 products = found;
 break;
 }
 }
 }

 if (!products.length) {
 return NextResponse.json({
 ok: false,
 storeName,
 platform,
 brandColor: meta.color,
 products: [],
 error:
 "Couldn't read products from this site — it may be password-protected, not a Shopify/Squarespace store, or have no public listings.",
 });
 }

 return NextResponse.json({
 ok: true,
 storeName,
 platform,
 brandColor: meta.color,
 hero: meta.hero,
 products,
 });
}
