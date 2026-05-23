import { neon } from "@neondatabase/serverless";

const getDatabaseUrl = () => {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is not set.");
 return url;
};

let tablesInitialized = false;

export async function initUserCollectionsTables() {
 if (tablesInitialized) return;
 const sql = neon(getDatabaseUrl());

 await sql`
 CREATE TABLE IF NOT EXISTS user_collections (
 id SERIAL PRIMARY KEY,
 user_id UUID NOT NULL,
 name VARCHAR(255) NOT NULL,
 cover_image TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 )
 `;
 await sql`CREATE INDEX IF NOT EXISTS idx_user_collections_user ON user_collections(user_id)`;

 await sql`
 CREATE TABLE IF NOT EXISTS user_collection_items (
 id SERIAL PRIMARY KEY,
 collection_id INT NOT NULL REFERENCES user_collections(id) ON DELETE CASCADE,
 product_id INT NOT NULL,
 product_snapshot JSONB,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 UNIQUE(collection_id, product_id)
 )
 `;
 await sql`CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON user_collection_items(collection_id)`;

 tablesInitialized = true;
}

export type UserCollection = {
 id: number;
 userId: string;
 name: string;
 coverImage: string | null;
 itemCount: number;
 createdAt: string;
};

export type CollectionItem = {
 id: number;
 collectionId: number;
 productId: number;
 snapshot: Record<string, unknown> | null;
 createdAt: string;
};

export async function getUserCollections(userId: string): Promise<UserCollection[]> {
 await initUserCollectionsTables();
 const sql = neon(getDatabaseUrl());

 const rows = await sql`
 SELECT
 c.id,
 c.user_id,
 c.name,
 c.cover_image,
 c.created_at,
 COUNT(i.id)::int AS item_count
 FROM user_collections c
 LEFT JOIN user_collection_items i ON i.collection_id = c.id
 WHERE c.user_id = ${userId}
 GROUP BY c.id
 ORDER BY c.created_at DESC
 `;

 return rows.map((r) => ({
 id: r.id as number,
 userId: r.user_id as string,
 name: r.name as string,
 coverImage: r.cover_image as string | null,
 itemCount: r.item_count as number,
 createdAt: r.created_at as string,
 }));
}

export async function createCollection(userId: string, name: string): Promise<UserCollection> {
 await initUserCollectionsTables();
 const sql = neon(getDatabaseUrl());

 const rows = await sql`
 INSERT INTO user_collections (user_id, name)
 VALUES (${userId}, ${name})
 RETURNING id, user_id, name, cover_image, created_at
 `;
 const r = rows[0];
 return {
 id: r.id as number,
 userId: r.user_id as string,
 name: r.name as string,
 coverImage: null,
 itemCount: 0,
 createdAt: r.created_at as string,
 };
}

export async function deleteCollection(userId: string, collectionId: number): Promise<boolean> {
 await initUserCollectionsTables();
 const sql = neon(getDatabaseUrl());

 const result = await sql`
 DELETE FROM user_collections WHERE id = ${collectionId} AND user_id = ${userId} RETURNING id
 `;
 return result.length > 0;
}

export async function renameCollection(userId: string, collectionId: number, name: string): Promise<boolean> {
 await initUserCollectionsTables();
 const sql = neon(getDatabaseUrl());

 const result = await sql`
 UPDATE user_collections
 SET name = ${name}, updated_at = NOW()
 WHERE id = ${collectionId} AND user_id = ${userId}
 RETURNING id
 `;
 return result.length > 0;
}

export async function getCollectionItems(collectionId: number): Promise<CollectionItem[]> {
 await initUserCollectionsTables();
 const sql = neon(getDatabaseUrl());

 const rows = await sql`
 SELECT id, collection_id, product_id, product_snapshot, created_at
 FROM user_collection_items
 WHERE collection_id = ${collectionId}
 ORDER BY created_at DESC
 `;

 return rows.map((r) => ({
 id: r.id as number,
 collectionId: r.collection_id as number,
 productId: r.product_id as number,
 snapshot: r.product_snapshot as Record<string, unknown> | null,
 createdAt: r.created_at as string,
 }));
}

export async function addToCollection(
 collectionId: number,
 productId: number,
 snapshot?: Record<string, unknown>
): Promise<boolean> {
 await initUserCollectionsTables();
 const sql = neon(getDatabaseUrl());

 try {
 await sql`
 INSERT INTO user_collection_items (collection_id, product_id, product_snapshot)
 VALUES (${collectionId}, ${productId}, ${snapshot ? JSON.stringify(snapshot) : null})
 ON CONFLICT (collection_id, product_id) DO NOTHING
 `;
 // Set cover image if this is the first item
 if (snapshot?.image) {
 await sql`
 UPDATE user_collections
 SET cover_image = ${snapshot.image as string}, updated_at = NOW()
 WHERE id = ${collectionId} AND cover_image IS NULL
 `;
 }
 return true;
 } catch {
 return false;
 }
}

export async function removeFromCollection(collectionId: number, productId: number): Promise<boolean> {
 await initUserCollectionsTables();
 const sql = neon(getDatabaseUrl());

 const result = await sql`
 DELETE FROM user_collection_items WHERE collection_id = ${collectionId} AND product_id = ${productId} RETURNING id
 `;
 return result.length > 0;
}

export async function getProductCollectionIds(userId: string, productId: number): Promise<number[]> {
 await initUserCollectionsTables();
 const sql = neon(getDatabaseUrl());

 const rows = await sql`
 SELECT c.id
 FROM user_collections c
 JOIN user_collection_items i ON i.collection_id = c.id
 WHERE c.user_id = ${userId} AND i.product_id = ${productId}
 `;
 return rows.map((r) => r.id as number);
}

/** Returns true if viewerId is friends with ownerId (or is the owner themselves). */
export async function canViewCollections(viewerId: string, ownerId: string): Promise<boolean> {
 if (viewerId === ownerId) return true;
 const sql = neon(getDatabaseUrl());
 const [a, b] = viewerId < ownerId ? [viewerId, ownerId] : [ownerId, viewerId];
 const rows = await sql`
 SELECT 1 FROM friendships WHERE user_a_id = ${a} AND user_b_id = ${b}
 `;
 return rows.length > 0;
}
