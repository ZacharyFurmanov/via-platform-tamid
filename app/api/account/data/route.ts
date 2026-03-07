import { NextResponse } from "next/server";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { auth } from "@/app/lib/auth";
import { getDb } from "@/app/lib/firebase-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const db = getDb();

  const [userSnap, productFavSnaps, storeFavSnaps, friendshipSnaps, requestSnaps, activitySnaps] =
    await Promise.all([
      getDoc(doc(collection(db, "users"), userId)),
      getDocs(collection(db, "product_favorites")),
      getDocs(collection(db, "store_favorites")),
      getDocs(collection(db, "friendships")),
      getDocs(collection(db, "friend_requests")),
      getDocs(collection(db, "friend_activity")),
    ]);

  const account = userSnap.exists()
    ? {
        id: userSnap.id,
        ...(userSnap.data() as Record<string, unknown>),
      }
    : null;

  const favoriteProducts = productFavSnaps.docs
    .map((snap) => snap.data() as { user_id?: string; product_id?: number; created_at?: string })
    .filter((row) => row.user_id === userId)
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .map((row) => ({ product_id: row.product_id, created_at: row.created_at }));

  const favoriteStores = storeFavSnaps.docs
    .map((snap) => snap.data() as { user_id?: string; store_slug?: string; created_at?: string })
    .filter((row) => row.user_id === userId)
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .map((row) => ({ store_slug: row.store_slug, created_at: row.created_at }));

  const friendships = friendshipSnaps.docs
    .map((snap) => snap.data() as { user_a_id?: string; user_b_id?: string; created_at?: string })
    .filter((row) => row.user_a_id === userId || row.user_b_id === userId)
    .map((row) => ({
      user_a_id: row.user_a_id,
      user_b_id: row.user_b_id,
      created_at: row.created_at,
    }));

  const friendRequests = requestSnaps.docs
    .map(
      (snap) =>
        snap.data() as {
          from_user_id?: string;
          to_user_id?: string;
          status?: string;
          created_at?: string;
        }
    )
    .filter((row) => row.from_user_id === userId || row.to_user_id === userId)
    .map((row) => ({
      from_user_id: row.from_user_id,
      to_user_id: row.to_user_id,
      status: row.status,
      created_at: row.created_at,
    }));

  const activity = activitySnaps.docs
    .map(
      (snap) =>
        snap.data() as {
          user_id?: string;
          activity_type?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        }
    )
    .filter((row) => row.user_id === userId)
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .map((row) => ({
      activity_type: row.activity_type,
      metadata: row.metadata,
      created_at: row.created_at,
    }));

  const data = {
    exported_at: new Date().toISOString(),
    account,
    favorite_products: favoriteProducts,
    favorite_stores: favoriteStores,
    friendships,
    friend_requests: friendRequests,
    activity,
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="via-data-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
