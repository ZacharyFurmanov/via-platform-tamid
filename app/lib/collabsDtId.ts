import { neon } from "@neondatabase/serverless";

/**
 * Extracts and caches a product's Shopify Collabs `dt_id` value so we can
 * skip the `collabs.shop` intermediate redirect and route buyers straight
 * to the store's cart URL — preserving Collabs attribution AND giving
 * single-click checkout UX.
 *
 * Confirmed working: a URL like `https://store.com/cart/{variantId}:1?dt_id=X`
 * registers a Collabs visit just as if the buyer came from `collabs.shop`.
 */

function getDbUrl(): string {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL not set");
 return url;
}

/**
 * Ensures the cache column exists on the products table. Cheap to run repeatedly.
 */
async function ensureDtIdColumn() {
 const sql = neon(getDbUrl());
 await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS collabs_dt_id TEXT`;
}

/**
 * Parses a `dt_id` value out of a URL's query string.
 * Handles both `?dt_id=...` and percent-encoded forms.
 */
function extractDtId(url: string): string | null {
 try {
 const u = new URL(url);
 const dt = u.searchParams.get("dt_id");
 return dt && dt.trim() ? dt : null;
 } catch {
 return null;
 }
}

/**
 * Follows the collabs.shop redirect chain ONCE to find the dt_id-bearing URL.
 * Uses redirect: "manual" so we can read the Location header on each hop.
 */
async function fetchDtIdFromCollabsLink(collabsLink: string, hops = 5): Promise<string | null> {
 let url = collabsLink;
 try {
 for (let i = 0; i < hops; i++) {
 const res = await fetch(url, {
  method: "GET",
  redirect: "manual",
  headers: { "User-Agent": "Mozilla/5.0 VYA-Bot/1.0" },
 });
 // Check if dt_id is in the current URL (some links embed it from the start)
 const direct = extractDtId(url);
 if (direct) return direct;

 // Follow the Location header
 const location = res.headers.get("location");
 if (!location) {
  // No more redirects — try parsing dt_id from the current URL one last time
  return direct;
 }
 // Resolve relative URLs against the previous one
 url = new URL(location, url).toString();
 const inLocation = extractDtId(url);
 if (inLocation) return inLocation;
 }
 } catch (err) {
 console.error("[collabsDtId] fetch failed:", err);
 }
 return null;
}

/**
 * Returns a product's cached `dt_id`. If not cached, follows the collabs
 * link redirect once to extract & cache it. Returns null if no link or
 * the chain doesn't produce a dt_id.
 */
export async function getDtIdForProduct(productId: number): Promise<string | null> {
 if (!Number.isFinite(productId)) return null;
 await ensureDtIdColumn();
 const sql = neon(getDbUrl());

 const rows = await sql`
 SELECT collabs_dt_id, collabs_link FROM products WHERE id = ${productId} LIMIT 1
 `;
 const row = (rows as { collabs_dt_id: string | null; collabs_link: string | null }[])[0];
 if (!row) return null;

 if (row.collabs_dt_id && row.collabs_dt_id.trim()) return row.collabs_dt_id;
 if (!row.collabs_link) return null;

 const fresh = await fetchDtIdFromCollabsLink(row.collabs_link);
 if (!fresh) return null;

 // Cache it
 await sql`UPDATE products SET collabs_dt_id = ${fresh} WHERE id = ${productId}`.catch(() => {});
 return fresh;
}

/**
 * Resolves (and caches) the full Collabs **discount** redirect URL for a product —
 * e.g. `https://store.com/discount/VYA?dt_id=...&redirect=/products/handle`. This is
 * the URL `collabs.shop` itself redirects to: it applies the creator discount AND
 * registers Collabs attribution server-side (before Shop Pay can redirect away).
 *
 * We reuse it for multi-item checkout by swapping its `redirect` param to a cart
 * path — keeping every item AND preserving commission, instead of collapsing the
 * bag to a single collabs.shop product.
 */
export async function getCollabsDiscountUrl(productId: number): Promise<string | null> {
 if (!Number.isFinite(productId)) return null;
 const sql = neon(getDbUrl());
 await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS collabs_discount_url TEXT`.catch(() => {});

 const rows = await sql`
  SELECT collabs_discount_url, collabs_link FROM products WHERE id = ${productId} LIMIT 1
 `;
 const row = (rows as { collabs_discount_url: string | null; collabs_link: string | null }[])[0];
 if (!row) return null;
 if (row.collabs_discount_url && row.collabs_discount_url.trim()) return row.collabs_discount_url;
 if (!row.collabs_link) return null;

 // Follow the collabs.shop chain to the first hop that's a /discount/ URL bearing a
 // dt_id — that's the attribution-setting discount link.
 let url = row.collabs_link;
 let found: string | null = null;
 try {
  for (let i = 0; i < 6; i++) {
   if (url.includes("/discount/") && extractDtId(url)) { found = url; break; }
   const res = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: { "User-Agent": "Mozilla/5.0 VYA-Bot/1.0" },
   });
   const loc = res.headers.get("location");
   if (!loc) break;
   url = new URL(loc, url).toString();
  }
  if (!found && url.includes("/discount/") && extractDtId(url)) found = url;
 } catch (err) {
  console.error("[collabsDtId] discount url fetch failed:", err);
 }
 if (!found) return null;

 await sql`UPDATE products SET collabs_discount_url = ${found} WHERE id = ${productId}`.catch(() => {});
 return found;
}

/**
 * Builds a Shopify cart URL with the dt_id query param appended.
 * Returns null if any required piece is missing.
 */
export function buildCartUrlWithDtId(args: {
 storeOrigin: string;
 variantId: string;
 dtId: string;
}): string | null {
 try {
 const url = new URL(`/cart/${args.variantId}:1`, args.storeOrigin);
 url.searchParams.set("dt_id", args.dtId);
 return url.toString();
 } catch {
 return null;
 }
}

/**
 * Builds a Shopify multi-item cart URL with dt_id appended. Items array is
 * pre-encoded as `variantId:qty` pairs.
 */
export function buildMultiCartUrlWithDtId(args: {
 storeOrigin: string;
 variantSpec: string; // e.g. "123:1,456:1"
 dtId: string;
}): string | null {
 try {
 const url = new URL(`/cart/${args.variantSpec}`, args.storeOrigin);
 url.searchParams.set("dt_id", args.dtId);
 return url.toString();
 } catch {
 return null;
 }
}
