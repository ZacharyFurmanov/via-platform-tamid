import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { FriendProfile, FriendRequest, ActivityFeedItem, ActivityType } from "./friends-types";
import { getDb, nextCounter, nowIso } from "./firebase-db";

const USERS_COLLECTION = "users";
const FRIENDSHIPS_COLLECTION = "friendships";
const FRIEND_REQUESTS_COLLECTION = "friend_requests";
const FRIEND_ACTIVITY_COLLECTION = "friend_activity";

type UserDoc = {
  id?: string;
  name?: string | null;
  email?: string;
  image?: string | null;
  phone?: string | null;
};

type FriendshipDoc = {
  user_a_id: string;
  user_b_id: string;
  created_at: string;
};

type FriendRequestDoc = {
  id: number;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  updated_at: string;
};

type FriendActivityDoc = {
  id: number;
  user_id: string;
  activity_type: ActivityType;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function initFriendsTables() {
  // Firestore collections are created implicitly.
}

function sortedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function friendshipId(userA: string, userB: string): string {
  const [a, b] = sortedPair(userA, userB);
  return `${a}__${b}`;
}

async function getAllUsers(): Promise<Map<string, FriendProfile>> {
  const db = getDb();
  const snaps = await getDocs(collection(db, USERS_COLLECTION));
  const map = new Map<string, FriendProfile>();

  for (const snap of snaps.docs) {
    const row = snap.data() as UserDoc;
    map.set(snap.id, {
      id: snap.id,
      name: row.name ?? null,
      email: row.email ?? "",
      image: row.image ?? null,
      phone: row.phone ?? null,
    });
  }

  return map;
}

async function getAllFriendRequests(): Promise<FriendRequestDoc[]> {
  const db = getDb();
  const snaps = await getDocs(collection(db, FRIEND_REQUESTS_COLLECTION));
  return snaps.docs
    .map((snap) => snap.data() as Partial<FriendRequestDoc>)
    .filter((row): row is FriendRequestDoc => {
      return (
        typeof row.id === "number" &&
        typeof row.from_user_id === "string" &&
        typeof row.to_user_id === "string" &&
        typeof row.status === "string" &&
        typeof row.created_at === "string" &&
        typeof row.updated_at === "string"
      );
    });
}

async function getAllFriendships(): Promise<FriendshipDoc[]> {
  const db = getDb();
  const snaps = await getDocs(collection(db, FRIENDSHIPS_COLLECTION));
  return snaps.docs
    .map((snap) => snap.data() as Partial<FriendshipDoc>)
    .filter(
      (row): row is FriendshipDoc =>
        typeof row.user_a_id === "string" &&
        typeof row.user_b_id === "string" &&
        typeof row.created_at === "string"
    );
}

export async function updateUserPhone(userId: string, phone: string): Promise<void> {
  await initFriendsTables();
  const db = getDb();
  const ref = doc(collection(db, USERS_COLLECTION), userId);
  await setDoc(ref, { phone, updated_at: nowIso() }, { merge: true });
}

export async function getUserByPhone(phone: string): Promise<FriendProfile | null> {
  await initFriendsTables();
  const users = await getAllUsers();

  for (const user of users.values()) {
    if (user.phone === phone) return user;
  }

  return null;
}

export async function getUsersByPhones(
  phones: string[],
  excludeUserId: string
): Promise<Pick<FriendProfile, "id" | "name" | "image">[]> {
  await initFriendsTables();
  if (phones.length === 0) return [];

  const phoneSet = new Set(phones);
  const users = await getAllUsers();
  const result: Pick<FriendProfile, "id" | "name" | "image">[] = [];

  for (const user of users.values()) {
    if (user.id === excludeUserId) continue;
    if (!user.phone || !phoneSet.has(user.phone)) continue;

    result.push({ id: user.id, name: user.name, image: user.image });
  }

  return result;
}

export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<{ status: "sent" | "accepted" | "already_friends" | "already_sent" }> {
  await initFriendsTables();
  const db = getDb();

  if (fromUserId === toUserId) {
    throw new Error("Cannot send friend request to yourself");
  }

  const friendshipRef = doc(collection(db, FRIENDSHIPS_COLLECTION), friendshipId(fromUserId, toUserId));
  const existingFriendship = await getDoc(friendshipRef);
  if (existingFriendship.exists()) {
    return { status: "already_friends" };
  }

  const requests = await getAllFriendRequests();
  const reverse = requests.find(
    (r) => r.from_user_id === toUserId && r.to_user_id === fromUserId && r.status === "pending"
  );

  if (reverse) {
    const reverseRef = doc(collection(db, FRIEND_REQUESTS_COLLECTION), String(reverse.id));
    await updateDoc(reverseRef, { status: "accepted", updated_at: nowIso() });

    const direct = requests.find(
      (r) => r.from_user_id === fromUserId && r.to_user_id === toUserId
    );

    if (direct) {
      await updateDoc(doc(collection(db, FRIEND_REQUESTS_COLLECTION), String(direct.id)), {
        status: "accepted",
        updated_at: nowIso(),
      });
    } else {
      const id = await nextCounter("friend_requests");
      const payload: FriendRequestDoc = {
        id,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        status: "accepted",
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      await setDoc(doc(collection(db, FRIEND_REQUESTS_COLLECTION), String(id)), payload);
    }

    const [a, b] = sortedPair(fromUserId, toUserId);
    const friendship: FriendshipDoc = {
      user_a_id: a,
      user_b_id: b,
      created_at: nowIso(),
    };
    await setDoc(friendshipRef, friendship);
    return { status: "accepted" };
  }

  const direct = requests.find((r) => r.from_user_id === fromUserId && r.to_user_id === toUserId);
  if (direct) {
    if (direct.status === "pending") {
      return { status: "already_sent" };
    }

    await updateDoc(doc(collection(db, FRIEND_REQUESTS_COLLECTION), String(direct.id)), {
      status: "pending",
      updated_at: nowIso(),
    });
    return { status: "sent" };
  }

  const id = await nextCounter("friend_requests");
  const payload: FriendRequestDoc = {
    id,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    status: "pending",
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await setDoc(doc(collection(db, FRIEND_REQUESTS_COLLECTION), String(id)), payload);

  return { status: "sent" };
}

export async function getPendingRequests(
  userId: string
): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
  await initFriendsTables();

  const [requests, users] = await Promise.all([getAllFriendRequests(), getAllUsers()]);

  const incoming = requests
    .filter((r) => r.to_user_id === userId && r.status === "pending")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r) => ({
      id: r.id,
      from_user_id: r.from_user_id,
      to_user_id: r.to_user_id,
      status: "pending" as const,
      created_at: r.created_at,
      from_user: users.get(r.from_user_id)
        ? {
            id: users.get(r.from_user_id)!.id,
            name: users.get(r.from_user_id)!.name,
            email: users.get(r.from_user_id)!.email,
            image: users.get(r.from_user_id)!.image,
            phone: users.get(r.from_user_id)!.phone,
          }
        : undefined,
    }));

  const outgoing = requests
    .filter((r) => r.from_user_id === userId && r.status === "pending")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r) => ({
      id: r.id,
      from_user_id: r.from_user_id,
      to_user_id: r.to_user_id,
      status: "pending" as const,
      created_at: r.created_at,
      to_user: users.get(r.to_user_id)
        ? {
            id: users.get(r.to_user_id)!.id,
            name: users.get(r.to_user_id)!.name,
            email: users.get(r.to_user_id)!.email,
            image: users.get(r.to_user_id)!.image,
            phone: users.get(r.to_user_id)!.phone,
          }
        : undefined,
    }));

  return { incoming, outgoing };
}

export async function acceptFriendRequest(requestId: number, userId: string): Promise<boolean> {
  await initFriendsTables();
  const db = getDb();

  const ref = doc(collection(db, FRIEND_REQUESTS_COLLECTION), String(requestId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  const row = snap.data() as Partial<FriendRequestDoc>;
  if (row.to_user_id !== userId || row.status !== "pending" || !row.from_user_id) return false;

  await updateDoc(ref, { status: "accepted", updated_at: nowIso() });

  const [a, b] = sortedPair(row.from_user_id, userId);
  const friendship: FriendshipDoc = {
    user_a_id: a,
    user_b_id: b,
    created_at: nowIso(),
  };
  await setDoc(doc(collection(db, FRIENDSHIPS_COLLECTION), friendshipId(a, b)), friendship);

  return true;
}

export async function declineFriendRequest(requestId: number, userId: string): Promise<boolean> {
  await initFriendsTables();
  const db = getDb();

  const ref = doc(collection(db, FRIEND_REQUESTS_COLLECTION), String(requestId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  const row = snap.data() as Partial<FriendRequestDoc>;
  if (row.to_user_id !== userId || row.status !== "pending") return false;

  await updateDoc(ref, { status: "declined", updated_at: nowIso() });
  return true;
}

export async function getFriends(userId: string): Promise<FriendProfile[]> {
  await initFriendsTables();

  const [friendships, users] = await Promise.all([getAllFriendships(), getAllUsers()]);

  const friendIds = new Set<string>();
  for (const friendship of friendships) {
    if (friendship.user_a_id === userId) {
      friendIds.add(friendship.user_b_id);
    } else if (friendship.user_b_id === userId) {
      friendIds.add(friendship.user_a_id);
    }
  }

  return Array.from(friendIds)
    .map((id) => users.get(id))
    .filter((item): item is FriendProfile => !!item)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function removeFriend(userId: string, friendId: string): Promise<boolean> {
  await initFriendsTables();
  const db = getDb();

  const ref = doc(collection(db, FRIENDSHIPS_COLLECTION), friendshipId(userId, friendId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  await deleteDoc(ref);
  return true;
}

export async function logActivity(
  userId: string,
  activityType: ActivityType,
  metadata: Record<string, unknown>
): Promise<void> {
  await initFriendsTables();
  const db = getDb();

  const id = await nextCounter("friend_activity");
  const payload: FriendActivityDoc = {
    id,
    user_id: userId,
    activity_type: activityType,
    metadata,
    created_at: nowIso(),
  };

  await setDoc(doc(collection(db, FRIEND_ACTIVITY_COLLECTION), String(id)), payload);
}

export async function getFriendsActivityFeed(userId: string, limit = 50): Promise<ActivityFeedItem[]> {
  await initFriendsTables();

  const [friendships, users, activitySnaps] = await Promise.all([
    getAllFriendships(),
    getAllUsers(),
    getDocs(collection(getDb(), FRIEND_ACTIVITY_COLLECTION)),
  ]);

  const friendIds = new Set<string>();
  for (const friendship of friendships) {
    if (friendship.user_a_id === userId) friendIds.add(friendship.user_b_id);
    if (friendship.user_b_id === userId) friendIds.add(friendship.user_a_id);
  }

  const activityRows = activitySnaps.docs
    .map((snap) => snap.data() as Partial<FriendActivityDoc>)
    .filter((row) => typeof row.user_id === "string" && friendIds.has(row.user_id))
    .filter(
      (row): row is FriendActivityDoc =>
        typeof row.id === "number" &&
        typeof row.activity_type === "string" &&
        typeof row.created_at === "string" &&
        typeof row.metadata === "object" &&
        row.metadata !== null
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);

  return activityRows.map((row) => {
    const user = users.get(row.user_id);
    return {
      id: row.id,
      user_id: row.user_id,
      activity_type: row.activity_type,
      metadata: row.metadata,
      created_at: row.created_at,
      user_name: user?.name ?? null,
      user_image: user?.image ?? null,
    };
  });
}
