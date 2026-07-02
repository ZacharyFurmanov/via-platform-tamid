import { eq } from "drizzle-orm";
import { getDb, sellers } from "./index";
import type { Seller } from "./index";

// Bridge from the current slug-based auth to the new sellers table: ensure a
// seller row exists for a store slug (created lazily on first write). Replaces
// the hardcoded stores.ts as the source of truth as the platform takes over.
export async function getOrCreateSeller(slug: string, name: string, email: string): Promise<Seller> {
 const db = getDb();
 await db.insert(sellers).values({ slug, name, email }).onConflictDoNothing({ target: sellers.slug });
 const [row] = await db.select().from(sellers).where(eq(sellers.slug, slug)).limit(1);
 return row;
}

export async function getSellerBySlug(slug: string): Promise<Seller | null> {
 const db = getDb();
 const [row] = await db.select().from(sellers).where(eq(sellers.slug, slug)).limit(1);
 return row ?? null;
}

export async function getSellerById(id: string): Promise<Seller | null> {
 const db = getDb();
 const [row] = await db.select().from(sellers).where(eq(sellers.id, id)).limit(1);
 return row ?? null;
}
