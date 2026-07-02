// Bridges a captured store's products into VYA's checkout. When a seller brings
// their site over, their products are imported as real db/items (the inventory the
// Stripe checkout reads), and each captured product page is matched to its item so
// "Buy now" runs through VYA's existing Stripe flow.
import { getSellerBySlug } from "./db/sellers";
import { createItem, listAvailableItems, deleteItemsBySource } from "./db/inventory";
import type { ImportedProduct } from "./store-import";

const parseCents = (price?: string) => Math.round((parseFloat((price || "").replace(/[^0-9.]/g, "")) || 0) * 100);
const detectCur = (price?: string) => (/£/.test(price || "") ? "GBP" : /€/.test(price || "") ? "EUR" : "USD");
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Create db/items (checkout-able inventory) for a captured store's products. */
export async function importProductsAsItems(slug: string, products: ImportedProduct[]): Promise<number> {
 const seller = await getSellerBySlug(slug);
 if (!seller) return 0;
 // Bringing a site over REPLACES its products — clear the previous capture's
 // items (keeping any that already sold) so re-syncing / switching sites doesn't
 // pile every store's inventory on top of each other.
 await deleteItemsBySource(seller.id, "captured").catch(() => 0);
 const existing = await listAvailableItems(seller.id);
 const have = new Set(existing.map((i) => i.title.toLowerCase().trim()));
 let n = 0;
 for (const p of products) {
 const title = (p.name || "").trim();
 const cents = parseCents(p.price);
 if (!title || !cents || have.has(title.toLowerCase())) continue;
 await createItem({
 sellerId: seller.id,
 title,
 priceCents: cents,
 currency: detectCur(p.price),
 images: p.images?.length ? p.images.slice(0, 8) : p.image ? [p.image] : [],
 status: p.available === false ? "sold" : "active",
 source: "captured",
 });
 have.add(title.toLowerCase());
 n++;
 }
 return n;
}

/** Find the db/item id for a captured product (by title) — for its Buy button. */
export async function matchItemId(slug: string, title: string): Promise<string | null> {
 const seller = await getSellerBySlug(slug);
 if (!seller || !title) return null;
 const items = await listAvailableItems(seller.id);
 const nt = norm(title);
 const m = items.find((i) => norm(i.title) === nt) || items.find((i) => nt.includes(norm(i.title)) || norm(i.title).includes(nt));
 return m?.id ?? null;
}
