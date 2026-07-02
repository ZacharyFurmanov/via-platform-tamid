import { and, eq, inArray, sql as dsql } from "drizzle-orm";
import { getDb } from "./index";
import { collections, itemCollections, items } from "./schema";
import type { Collection, Item } from "./schema";

function slugify(s: string): string {
 return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "collection";
}

/** Create a collection keyed on an EXACT slug (e.g. a captured Shopify collection handle),
 * so the VYA collection lines up 1:1 with the imported /collections/{handle} page. */
export async function ensureCollection(sellerId: string, slug: string, title: string): Promise<Collection> {
 const db = getDb();
 const s = slugify(slug);
 const existing = await db.select().from(collections).where(and(eq(collections.sellerId, sellerId), eq(collections.slug, s))).limit(1);
 if (existing[0]) return existing[0];
 const [row] = await db.insert(collections).values({ sellerId, title: (title.trim() || s).slice(0, 80), slug: s }).returning();
 return row;
}

/** Collection titles per item (batched), for prefilling the editor's collections picker. */
export async function getCollectionTitlesForItems(itemIds: string[]): Promise<Record<string, string[]>> {
 const out: Record<string, string[]> = {};
 if (!itemIds.length) return out;
 const db = getDb();
 const rows = await db
  .select({ itemId: itemCollections.itemId, title: collections.title })
  .from(itemCollections)
  .innerJoin(collections, eq(collections.id, itemCollections.collectionId))
  .where(inArray(itemCollections.itemId, itemIds));
 for (const r of rows) { (out[r.itemId] ||= []).push(r.title); }
 return out;
}

/** Get a seller's collection by title, creating it if it doesn't exist (slug-keyed). */
export async function getOrCreateCollection(sellerId: string, title: string): Promise<Collection> {
 const db = getDb();
 const slug = slugify(title);
 const existing = await db.select().from(collections).where(and(eq(collections.sellerId, sellerId), eq(collections.slug, slug))).limit(1);
 if (existing[0]) return existing[0];
 const [row] = await db.insert(collections).values({ sellerId, title: title.trim().slice(0, 80), slug }).returning();
 return row;
}

/** A seller's collections with a live count of active items in each. */
export async function listCollections(sellerId: string): Promise<(Collection & { itemCount: number })[]> {
 const db = getDb();
 const rows = await db
 .select({
 id: collections.id,
 sellerId: collections.sellerId,
 title: collections.title,
 slug: collections.slug,
 createdAt: collections.createdAt,
 itemCount: dsql<number>`count(${itemCollections.itemId})::int`,
 })
 .from(collections)
 .leftJoin(itemCollections, eq(itemCollections.collectionId, collections.id))
 .where(eq(collections.sellerId, sellerId))
 .groupBy(collections.id)
 .orderBy(collections.title);
 return rows as (Collection & { itemCount: number })[];
}

/** Replace an item's collection membership with exactly the given collection ids. */
export async function setItemCollections(itemId: string, collectionIds: string[]): Promise<void> {
 const db = getDb();
 await db.delete(itemCollections).where(eq(itemCollections.itemId, itemId));
 const ids = [...new Set(collectionIds.filter(Boolean))];
 if (ids.length) {
 await db.insert(itemCollections).values(ids.map((collectionId) => ({ itemId, collectionId }))).onConflictDoNothing();
 }
}

/** A seller's collection by slug (used to map a captured /collections/{handle} page). */
export async function getCollectionBySlug(sellerId: string, slug: string): Promise<Collection | null> {
 const db = getDb();
 const rows = await db.select().from(collections).where(and(eq(collections.sellerId, sellerId), eq(collections.slug, slug))).limit(1);
 return rows[0] ?? null;
}

export async function getItemCollectionIds(itemId: string): Promise<string[]> {
 const db = getDb();
 const rows = await db.select({ collectionId: itemCollections.collectionId }).from(itemCollections).where(eq(itemCollections.itemId, itemId));
 return rows.map((r) => r.collectionId);
}

/** Active items in a collection (sold/removed drop out automatically). */
export async function listCollectionItems(collectionId: string): Promise<Item[]> {
 const db = getDb();
 const rows = await db
 .select()
 .from(items)
 .innerJoin(itemCollections, eq(itemCollections.itemId, items.id))
 .where(and(eq(itemCollections.collectionId, collectionId), eq(items.status, "active")));
 return rows.map((r) => r.items);
}
