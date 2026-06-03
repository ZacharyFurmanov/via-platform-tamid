import { neon } from "@neondatabase/serverless";

export type CommunityPost = {
 id: number;
 user_id: string | null;
 display_name: string;
 content: string;
 image_url: string | null;
 is_pinned: boolean;
 created_at: string;
 like_count: number;
 liked_by_me: boolean;
};

function getSql() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL not set");
 return neon(url);
}

export async function initCommunityTables() {
 const sql = getSql();
 await sql`
 CREATE TABLE IF NOT EXISTS community_posts (
 id SERIAL PRIMARY KEY,
 user_id TEXT,
 display_name TEXT NOT NULL,
 content TEXT NOT NULL,
 image_url TEXT,
 is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )
 `;
 await sql`CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC)`;
 await sql`CREATE INDEX IF NOT EXISTS idx_community_posts_pinned ON community_posts(is_pinned, created_at DESC)`;

 await sql`
 CREATE TABLE IF NOT EXISTS community_post_likes (
 post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
 liker TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY (post_id, liker)
 )
 `;
}

export async function createPost(args: {
 userId: string | null;
 displayName: string;
 content: string;
 imageUrl?: string | null;
}): Promise<{ id: number }> {
 await initCommunityTables();
 const sql = getSql();
 const rows = await sql`
 INSERT INTO community_posts (user_id, display_name, content, image_url)
 VALUES (${args.userId}, ${args.displayName}, ${args.content}, ${args.imageUrl ?? null})
 RETURNING id
 `;
 return { id: (rows as { id: number }[])[0].id };
}

export async function listPosts(args: {
 viewerId: string;
 limit: number;
 cursor: number | null;
}): Promise<CommunityPost[]> {
 await initCommunityTables();
 const sql = getSql();

 const rows = args.cursor != null
 ? await sql`
   SELECT p.id, p.user_id, p.display_name, p.content, p.image_url, p.is_pinned, p.created_at,
   COALESCE(lc.like_count, 0)::int AS like_count,
   EXISTS (SELECT 1 FROM community_post_likes l2 WHERE l2.post_id = p.id AND l2.liker = ${args.viewerId}) AS liked_by_me
   FROM community_posts p
   LEFT JOIN (
   SELECT post_id, COUNT(*) AS like_count
   FROM community_post_likes
   GROUP BY post_id
   ) lc ON lc.post_id = p.id
   WHERE p.id < ${args.cursor}
   ORDER BY p.is_pinned DESC, p.created_at DESC, p.id DESC
   LIMIT ${args.limit}
  `
 : await sql`
   SELECT p.id, p.user_id, p.display_name, p.content, p.image_url, p.is_pinned, p.created_at,
   COALESCE(lc.like_count, 0)::int AS like_count,
   EXISTS (SELECT 1 FROM community_post_likes l2 WHERE l2.post_id = p.id AND l2.liker = ${args.viewerId}) AS liked_by_me
   FROM community_posts p
   LEFT JOIN (
   SELECT post_id, COUNT(*) AS like_count
   FROM community_post_likes
   GROUP BY post_id
   ) lc ON lc.post_id = p.id
   ORDER BY p.is_pinned DESC, p.created_at DESC, p.id DESC
   LIMIT ${args.limit}
  `;

 return (rows as Array<Record<string, unknown>>).map((r) => ({
 id: r.id as number,
 user_id: (r.user_id as string | null) ?? null,
 display_name: r.display_name as string,
 content: r.content as string,
 image_url: (r.image_url as string | null) ?? null,
 is_pinned: r.is_pinned as boolean,
 created_at: (r.created_at as Date)?.toISOString?.() ?? String(r.created_at),
 like_count: r.like_count as number,
 liked_by_me: r.liked_by_me as boolean,
 }));
}

export async function toggleLike(args: { postId: number; liker: string }): Promise<{ liked: boolean }> {
 await initCommunityTables();
 const sql = getSql();
 const existing = await sql`
 SELECT 1 FROM community_post_likes WHERE post_id = ${args.postId} AND liker = ${args.liker} LIMIT 1
 `;
 if ((existing as unknown[]).length > 0) {
 await sql`DELETE FROM community_post_likes WHERE post_id = ${args.postId} AND liker = ${args.liker}`;
 return { liked: false };
 }
 await sql`
 INSERT INTO community_post_likes (post_id, liker)
 VALUES (${args.postId}, ${args.liker})
 ON CONFLICT DO NOTHING
 `;
 return { liked: true };
}

export async function deletePost(args: { postId: number; userId: string }): Promise<boolean> {
 const sql = getSql();
 const rows = await sql`
 DELETE FROM community_posts
 WHERE id = ${args.postId} AND user_id = ${args.userId}
 RETURNING id
 `;
 return (rows as unknown[]).length > 0;
}
