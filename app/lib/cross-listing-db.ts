import { neon } from "@neondatabase/serverless";
import { getItem } from "./db/inventory";
import { listOnEbay, endOnEbay, ebayConnected, type EbayResult } from "./ebay";
import { listOnDepop, endOnDepop, depopConnected, type DepopResult } from "./depop";
import { listOnEtsy, endOnEtsy, etsyConnected, type EtsyResult } from "./etsy";

// Cross-listing: a seller publishes to VYA, and we fan the item out to their other
// marketplaces; when it sells ANYWHERE, we pull it from everywhere (no double-sell).
//
// Reality check baked into the design: Depop/Poshmark/Grailed have NO public listing
// API, so we can't literally auto-post or auto-remove there — we generate paste-ready
// content and track status, and tell the seller exactly where to pull a sold item.
// eBay/Etsy DO have APIs (hasApi), so real auto-post/remove can plug in there later.

export type Platform = { key: string; name: string; hasApi: boolean; live?: boolean; titleMax: number; profileUrl: (handle: string) => string };

export const PLATFORMS: Platform[] = [
 // eBay is the one live API integration (auto-posts + auto-removes). The rest are "copy" channels:
 // VYA writes each a title within its char limit + tags, and the seller pastes it.
 { key: "ebay", name: "eBay", hasApi: true, live: true, titleMax: 80, profileUrl: (h) => `https://www.ebay.com/usr/${h}` },
 { key: "depop", name: "Depop", hasApi: false, live: true, titleMax: 65, profileUrl: (h) => `https://www.depop.com/${h}` },
 { key: "poshmark", name: "Poshmark", hasApi: false, live: true, titleMax: 80, profileUrl: (h) => `https://poshmark.com/closet/${h}` },
 { key: "etsy", name: "Etsy", hasApi: true, live: true, titleMax: 140, profileUrl: (h) => `https://www.etsy.com/shop/${h}` },
 { key: "vestiaire", name: "Vestiaire Collective", hasApi: false, live: true, titleMax: 50, profileUrl: (h) => `https://www.vestiairecollective.com/profile/${h}/` },
 { key: "vinted", name: "Vinted", hasApi: false, live: true, titleMax: 100, profileUrl: (h) => `https://www.vinted.com/member/${h}` },
 { key: "mercari", name: "Mercari", hasApi: false, live: true, titleMax: 80, profileUrl: (h) => `https://www.mercari.com/u/${h}/` },
 { key: "grailed", name: "Grailed", hasApi: false, live: true, titleMax: 60, profileUrl: (h) => `https://www.grailed.com/${h}` },
 { key: "instagram", name: "Instagram", hasApi: false, live: true, titleMax: 125, profileUrl: (h) => `https://www.instagram.com/${h}/` },
 { key: "facebook", name: "Facebook Marketplace", hasApi: false, live: true, titleMax: 100, profileUrl: (h) => `https://www.facebook.com/${h}` },
];
export const platformByKey = (k: string) => PLATFORMS.find((p) => p.key === k) || null;

export type ItemForPost = { title: string; brand?: string | null; condition?: string | null; size?: string | null; category?: string | null; priceCents: number; description?: string | null };

// Paste-ready listing content tuned to a platform (title within its char limit, tags,
// and — for Depop — inline hashtags). Template-based, no AI cost.
export function crossPostContent(item: ItemForPost, platformKey: string): { title: string; body: string; tags: string[]; price: string } {
 const max = platformByKey(platformKey)?.titleMax || 80;
 const brand = (item.brand || "").trim();
 const base = [brand, item.title].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
 const title = base.length > max ? base.slice(0, max - 1).trimEnd() + "…" : base;
 const bits = [brand, item.category, item.size ? `Size ${item.size}` : "", item.condition ? `${item.condition} condition` : ""].filter(Boolean);
 const tags = Array.from(new Set([brand, item.category || "", item.size ? `size ${item.size}` : "", "vintage"].filter(Boolean).map((t) => String(t).toLowerCase().replace(/\s+/g, ""))));
 const desc = (item.description || "").trim() || `${bits.join(" · ")}. One-of-one — grab it before it's gone.`;
 // Hashtag-driven feeds (Depop, Instagram) get inline tags appended to the caption.
 const hashtagPlatforms = new Set(["depop", "instagram"]);
 const body = hashtagPlatforms.has(platformKey)
 ? `${desc}\n\n${tags.slice(0, platformKey === "instagram" ? 10 : 5).map((t) => `#${t}`).join(" ")}`
 : desc;
 return { title, body, tags, price: `$${Math.round(item.priceCents / 100)}` };
}

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is not set.");
 return neon(url);
}

let ensured = false;
async function ensureTables() {
 if (ensured) return;
 const sql = db();
 await sql`CREATE TABLE IF NOT EXISTS store_platform_accounts (
  id SERIAL PRIMARY KEY, store_slug TEXT NOT NULL, platform TEXT NOT NULL, handle TEXT NOT NULL,
  auto_list BOOLEAN NOT NULL DEFAULT true, connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_slug, platform)
 )`;
 await sql`CREATE TABLE IF NOT EXISTS cross_listings (
  id SERIAL PRIMARY KEY, store_slug TEXT NOT NULL, item_id TEXT NOT NULL, platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', external_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_slug, item_id, platform)
 )`;
 await sql`CREATE INDEX IF NOT EXISTS idx_cross_listings_item ON cross_listings (item_id)`;
 ensured = true;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type PlatformAccount = { platform: string; handle: string; autoList: boolean };

export async function getPlatformAccounts(storeSlug: string): Promise<PlatformAccount[]> {
 await ensureTables();
 const rows = (await db()`SELECT platform, handle, auto_list FROM store_platform_accounts WHERE store_slug = ${storeSlug} ORDER BY platform`.catch(() => [])) as any[];
 return rows.map((r) => ({ platform: r.platform, handle: r.handle, autoList: r.auto_list === true }));
}

export async function upsertPlatformAccount(storeSlug: string, platform: string, handle: string, autoList: boolean): Promise<void> {
 if (!platformByKey(platform)) return;
 await ensureTables();
 const h = handle.trim().replace(/^@/, "").slice(0, 120);
 await db()`
  INSERT INTO store_platform_accounts (store_slug, platform, handle, auto_list)
  VALUES (${storeSlug}, ${platform}, ${h}, ${autoList})
  ON CONFLICT (store_slug, platform) DO UPDATE SET handle = EXCLUDED.handle, auto_list = EXCLUDED.auto_list
 `.catch(() => {});
}

export async function removePlatformAccount(storeSlug: string, platform: string): Promise<void> {
 await ensureTables();
 await db()`DELETE FROM store_platform_accounts WHERE store_slug = ${storeSlug} AND platform = ${platform}`.catch(() => {});
}

/** On publish to VYA: queue a cross-listing for every connected, auto-list platform. */
export async function createCrossListingsForItem(storeSlug: string, itemId: string): Promise<number> {
 await ensureTables();
 const accounts = (await getPlatformAccounts(storeSlug)).filter((a) => a.autoList);
 if (!accounts.length) return 0;
 const sql = db();
 let n = 0;
 for (const a of accounts) {
 await sql`INSERT INTO cross_listings (store_slug, item_id, platform, status) VALUES (${storeSlug}, ${itemId}, ${a.platform}, 'pending') ON CONFLICT (store_slug, item_id, platform) DO NOTHING`.catch(() => {});
 n++;
 }
 return n;
}

// Actually POST to the platforms that have a real API (eBay + Depop). Best-effort +
// background: on success we store the live listing URL, on failure the error message.
export async function syncItemToApiPlatforms(storeSlug: string, itemId: string): Promise<void> {
 const [ebayOn, depopOn, etsyOn] = await Promise.all([
 ebayConnected(storeSlug).catch(() => false),
 depopConnected(storeSlug).catch(() => false),
 etsyConnected(storeSlug).catch(() => false),
 ]);
 if (!ebayOn && !depopOn && !etsyOn) return;
 const item = await getItem(itemId).catch(() => null);
 if (!item) return;

 if (etsyOn) {
 await markCrossListing(storeSlug, itemId, "etsy", "pending");
 const r = await listOnEtsy(storeSlug, {
 itemId, title: item.title, description: item.description ?? item.title,
 priceUsd: (item.priceCents || 0) / 100, imageUrls: item.images || [],
 }).catch((): EtsyResult => ({ ok: false, error: "Etsy push failed." }));
 await markCrossListing(storeSlug, itemId, "etsy", r.ok ? "listed" : "error", r.ok ? (r.listingUrl ?? null) : (r.error ?? "error"));
 }

 if (ebayOn) {
 await markCrossListing(storeSlug, itemId, "ebay", "pending");
 const r = await listOnEbay(storeSlug, {
 itemId, title: item.title, description: item.description ?? null, brand: item.brand,
 condition: item.condition, size: item.size, priceCents: item.priceCents, currency: item.currency || "USD",
 images: item.images || [],
 }).catch((): EbayResult => ({ ok: false, error: "eBay push failed." }));
 await markCrossListing(storeSlug, itemId, "ebay", r.ok ? "listed" : "error", r.ok ? (r.listingUrl ?? null) : (r.error ?? "error"));
 }

 if (depopOn) {
 await markCrossListing(storeSlug, itemId, "depop", "pending");
 const r = await listOnDepop(storeSlug, {
 itemId, title: item.title, description: item.description ?? null, brand: item.brand,
 condition: item.condition, size: item.size, category: item.category, colour: null,
 priceCents: item.priceCents, currency: item.currency || "USD", images: item.images || [],
 }).catch((): DepopResult => ({ ok: false, error: "Depop push failed." }));
 await markCrossListing(storeSlug, itemId, "depop", r.ok ? "listed" : "error", r.ok ? (r.listingUrl ?? null) : (r.error ?? "error"));
 }
}

export type CrossListing = { itemId: string; platform: string; status: string; externalUrl: string | null };

export async function getCrossListingsForItem(storeSlug: string, itemId: string): Promise<CrossListing[]> {
 await ensureTables();
 const rows = (await db()`SELECT item_id, platform, status, external_url FROM cross_listings WHERE store_slug = ${storeSlug} AND item_id = ${itemId}`.catch(() => [])) as any[];
 return rows.map((r) => ({ itemId: r.item_id, platform: r.platform, status: r.status, externalUrl: r.external_url ?? null }));
}

export async function markCrossListing(storeSlug: string, itemId: string, platform: string, status: string, externalUrl?: string | null): Promise<void> {
 await ensureTables();
 await db()`
  INSERT INTO cross_listings (store_slug, item_id, platform, status, external_url, updated_at)
  VALUES (${storeSlug}, ${itemId}, ${platform}, ${status}, ${externalUrl ?? null}, now())
  ON CONFLICT (store_slug, item_id, platform) DO UPDATE SET status = EXCLUDED.status, external_url = COALESCE(EXCLUDED.external_url, cross_listings.external_url), updated_at = now()
 `.catch(() => {});
}

/**
 * The item sold (on `soldPlatform`, or 'vya'). Flip its cross-listings: the platform it
 * sold on → 'sold', every other → 'removed' (needs pulling). Returns the still-live
 * platforms the seller must remove it from, with API vs manual noted.
 */
export async function delistEverywhere(itemId: string, soldPlatform: string): Promise<{ platform: string; name: string; handle: string | null; hasApi: boolean }[]> {
 await ensureTables();
 const sql = db();
 const rows = (await sql`SELECT store_slug, platform, status, external_url FROM cross_listings WHERE item_id = ${itemId}`.catch(() => [])) as any[];
 if (!rows.length) return [];
 const storeSlug = rows[0].store_slug as string;
 const accounts = await getPlatformAccounts(storeSlug);
 const toPull: { platform: string; name: string; handle: string | null; hasApi: boolean }[] = [];
 for (const r of rows) {
 const isSoldHere = r.platform === soldPlatform;
 const next = isSoldHere ? "sold" : "removed";
 await sql`UPDATE cross_listings SET status = ${next}, updated_at = now() WHERE item_id = ${itemId} AND platform = ${r.platform}`.catch(() => {});
 // eBay has an API — actually end the live listing (unless eBay is where it sold).
 if (!isSoldHere && r.platform === "ebay") endOnEbay(storeSlug, itemId).catch(() => {});
 if (!isSoldHere && r.platform === "depop") endOnDepop(storeSlug, itemId).catch(() => {});
 // Etsy has an API — deactivate the live listing (its id lives in the stored listing URL).
 if (!isSoldHere && r.platform === "etsy" && r.external_url) endOnEtsy(storeSlug, String(r.external_url)).catch(() => {});
 if (!isSoldHere && r.status !== "removed" && r.status !== "sold") {
 const p = platformByKey(r.platform);
 toPull.push({ platform: r.platform, name: p?.name || r.platform, handle: accounts.find((a) => a.platform === r.platform)?.handle || null, hasApi: !!p?.hasApi });
 }
 }
 return toPull;
}

export type BoardRow = { itemId: string; title: string; priceCents: number; image: string | null; status: string; listings: Record<string, string> };

/** Every active/pending item with its per-platform cross-listing status, for the tab. */
export async function getCrossListBoard(storeSlug: string): Promise<BoardRow[]> {
 await ensureTables();
 const rows = (await db()`
  SELECT i.id::text AS item_id, i.title, i.price_cents, i.images, i.status,
   COALESCE(json_object_agg(c.platform, c.status) FILTER (WHERE c.platform IS NOT NULL), '{}') AS listings
  FROM items i JOIN sellers s ON s.id = i.seller_id
  LEFT JOIN cross_listings c ON c.item_id = i.id::text AND c.store_slug = ${storeSlug}
  WHERE s.slug = ${storeSlug} AND i.status IN ('active', 'reserved')
  GROUP BY i.id, i.title, i.price_cents, i.images, i.status
  ORDER BY i.created_at DESC LIMIT 200
 `.catch(() => [])) as any[];
 return rows.map((r) => ({
 itemId: r.item_id, title: String(r.title || "Item"), priceCents: Number(r.price_cents || 0),
 image: Array.isArray(r.images) ? (r.images[0] ?? null) : null, status: String(r.status),
 listings: (r.listings && typeof r.listings === "object") ? r.listings : {},
 }));
}
