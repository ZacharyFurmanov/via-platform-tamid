import { neon } from "@neondatabase/serverless";
import type { FriendProfile, FriendRequest, ActivityFeedItem, ActivityType } from "./friends-types";

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set.");
  }
  return url;
};

let tablesInitialized = false;

export async function initFriendsTables() {
  if (tablesInitialized) return;
  const sql = neon(getDatabaseUrl());

  await sql`
    CREATE TABLE IF NOT EXISTS friendships (
      id SERIAL PRIMARY KEY,
      user_a_id UUID NOT NULL,
      user_b_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_a_id, user_b_id),
      CHECK (user_a_id < user_b_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_friendships_a ON friendships(user_a_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_friendships_b ON friendships(user_b_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id SERIAL PRIMARY KEY,
      from_user_id UUID NOT NULL,
      to_user_id UUID NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(from_user_id, to_user_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_user_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_user_id, status)`;

  await sql`
    CREATE TABLE IF NOT EXISTS friend_activity (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      activity_type VARCHAR(50) NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_friend_activity_user ON friend_activity(user_id, created_at DESC)`;

  tablesInitialized = true;
}

// --- Phone helpers ---

export async function updateUserPhone(userId: string, phone: string): Promise<void> {
  await initFriendsTables();
  const sql = neon(getDatabaseUrl());
  await sql`UPDATE users SET phone = ${phone}, updated_at = NOW() WHERE id = ${userId}`;
}

export async function getUserByPhone(phone: string): Promise<FriendProfile | null> {
  await initFriendsTables();
  const sql = neon(getDatabaseUrl());
  const rows = await sql`SELECT id, name, email, image, phone FROM users WHERE phone = ${phone}`;
  if (!rows[0]) return null;
  return rows[0] as FriendProfile;
}

export async function getUsersByPhones(phones: string[], excludeUserId: string): Promise<Pick<FriendProfile, "id" | "name" | "image">[]> {
  await initFriendsTables();
  const sql = neon(getDatabaseUrl());
  const rows = await sql`SELECT id, name, image FROM users WHERE phone = ANY(${phones}) AND id != ${excludeUserId}`;
  return rows as Pick<FriendProfile, "id" | "name" | "image">[];
}

// --- Friend Requests ---

export async function sendFriendRequest(fromUserId: string, toUserId: string): Promise<{ status: "sent" | "accepted" | "already_friends" | "already_sent" }> {
  await initFriendsTables();
  const sql = neon(getDatabaseUrl());

  if (fromUserId === toUserId) {
    throw new Error("Cannot send friend request to yourself");
  }

  // Check if already friends
  const [a, b] = fromUserId < toUserId ? [fromUserId, toUserId] : [toUserId, fromUserId];
  const existingFriendship = await sql`
    SELECT id FROM friendships WHERE user_a_id = ${a} AND user_b_id = ${b}
  `;
  if (existingFriendship.length > 0) {
    return { status: "already_friends" };
  }

  // Check if there's a pending request from the other user (mutual request -> auto-accept)
  const reverseRequest = await sql`
    SELECT id FROM friend_requests WHERE from_user_id = ${toUserId} AND to_user_id = ${fromUserId} AND status = 'pending'
  `;
  if (reverseRequest.length > 0) {
    // Auto-accept: update both requests and create friendship
    await sql`UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = ${reverseRequest[0].id}`;
    await sql`
      INSERT INTO friend_requests (from_user_id, to_user_id, status)
      VALUES (${fromUserId}, ${toUserId}, 'accepted')
      ON CONFLICT (from_user_id, to_user_id) DO UPDATE SET status = 'accepted', updated_at = NOW()
    `;
    await sql`INSERT INTO friendships (user_a_id, user_b_id) VALUES (${a}, ${b}) ON CONFLICT DO NOTHING`;
    return { status: "accepted" };
  }

  // Check if already sent
  const existingRequest = await sql`
    SELECT id, status FROM friend_requests WHERE from_user_id = ${fromUserId} AND to_user_id = ${toUserId}
  `;
  if (existingRequest.length > 0) {
    if (existingRequest[0].status === "pending") return { status: "already_sent" };
    // If previously declined, re-send
    await sql`UPDATE friend_requests SET status = 'pending', updated_at = NOW() WHERE id = ${existingRequest[0].id}`;
    return { status: "sent" };
  }

  await sql`INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES (${fromUserId}, ${toUserId}, 'pending')`;
  return { status: "sent" };
}

export async function getPendingRequests(userId: string): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
  await initFriendsTables();
  const sql = neon(getDatabaseUrl());

  const incoming = await sql`
    SELECT fr.*, u.id as u_id, u.name as u_name, u.email as u_email, u.image as u_image
    FROM friend_requests fr
    JOIN users u ON u.id = fr.from_user_id
    WHERE fr.to_user_id = ${userId} AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
  `;

  const outgoing = await sql`
    SELECT fr.*, u.id as u_id, u.name as u_name, u.email as u_email, u.image as u_image
    FROM friend_requests fr
    JOIN users u ON u.id = fr.to_user_id
    WHERE fr.from_user_id = ${userId} AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
  `;

  return {
    incoming: incoming.map((r) => ({
      id: r.id as number,
      from_user_id: r.from_user_id as string,
      to_user_id: r.to_user_id as string,
      status: r.status as "pending",
      created_at: r.created_at as string,
      from_user: { id: r.u_id as string, name: r.u_name as string | null, email: r.u_email as string, image: r.u_image as string | null, phone: null },
    })),
    outgoing: outgoing.map((r) => ({
      id: r.id as number,
      from_user_id: r.from_user_id as string,
      to_user_id: r.to_user_id as string,
      status: r.status as "pending",
      created_at: r.created_at as string,
      to_user: { id: r.u_id as string, name: r.u_name as string | null, email: r.u_email as string, image: r.u_image as string | null, phone: null },
    })),
  };
}

export async function acceptFriendRequest(requestId: number, userId: string): Promise<boolean> {
  await initFriendsTables();
  const sql = neon(getDatabaseUrl());

  const rows = await sql`
    SELECT * FROM friend_requests WHERE id = ${requestId} AND to_user_id = ${userId} AND status = 'pending'
  `;
  if (!rows[0]) return false;

  const fromUserId = rows[0].from_user_id as string;
  const [a, b] = fromUserId < userId ? [fromUserId, userId] : [userId, fromUserId];

  await sql`UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = ${requestId}`;
  await sql`INSERT INTO friendships (user_a_id, user_b_id) VALUES (${a}, ${b}) ON CONFLICT DO NOTHING`;
  return true;
}

export async function declineFriendRequest(requestId: number, userId: string): Promise<boolean> {
  await initFriendsTables();
  const sql = neon(getDatabaseUrl());

  const result = await sql`
    UPDATE friend_requests SET status = 'declined', updated_at = NOW()
    WHERE id = ${requestId} AND to_user_id = ${userId} AND status = 'pending'
    RETURNING id
  `;
  return result.length > 0;
}

// --- Friends ---

export async function getFriends(userId: string): Promise<FriendProfile[]> {
  await initFriendsTables();
  const sql = neon(getDatabaseUrl());

  const rows = await sql`
    SELECT u.id, u.name, u.email, u.image, u.phone
    FROM friendships f
    JOIN users u ON (u.id = f.user_a_id OR u.id = f.user_b_id)
    WHERE (f.user_a_id = ${userId} OR f.user_b_id = ${userId})
      AND u.id != ${userId}
    ORDER BY u.name
  `;
  return rows as FriendProfile[];
}

export async function removeFriend(userId: string, friendId: string): Promise<boolean> {
  await initFriendsTables();
  const sql = neon(getDatabaseUrl());

  const [a, b] = userId < friendId ? [userId, friendId] : [friendId, userId];
  const result = await sql`DELETE FROM friendships WHERE user_a_id = ${a} AND user_b_id = ${b} RETURNING id`;
  return result.length > 0;
}

// --- Activity ---

export async function logActivity(userId: string, activityType: ActivityType, metadata: Record<string, unknown>): Promise<void> {
  await initFriendsTables();
  const sql = neon(getDatabaseUrl());
  await sql`
    INSERT INTO friend_activity (user_id, activity_type, metadata)
    VALUES (${userId}, ${activityType}, ${JSON.stringify(metadata)})
  `;
}

export async function getFriendsActivityFeed(userId: string, limit = 50): Promise<ActivityFeedItem[]> {
  await initFriendsTables();
  const sql = neon(getDatabaseUrl());

  const rows = await sql`
    SELECT fa.id, fa.user_id, fa.activity_type, fa.metadata, fa.created_at,
           u.name as user_name, u.image as user_image
    FROM friend_activity fa
    JOIN users u ON u.id = fa.user_id
    WHERE fa.user_id IN (
      SELECT CASE
        WHEN f.user_a_id = ${userId} THEN f.user_b_id
        ELSE f.user_a_id
      END
      FROM friendships f
      WHERE f.user_a_id = ${userId} OR f.user_b_id = ${userId}
    )
    ORDER BY fa.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: r.id as number,
    user_id: r.user_id as string,
    activity_type: r.activity_type as ActivityType,
    metadata: (typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata) as Record<string, unknown>,
    created_at: r.created_at as string,
    user_name: r.user_name as string | null,
    user_image: r.user_image as string | null,
  }));
}
